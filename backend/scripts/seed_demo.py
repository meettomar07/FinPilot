import sys
import json
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

import firebase_admin
from firebase_admin import credentials, auth

from app.config import get_settings
from app.database import SessionLocal
from app.utils.seeder import seed_demo_data
from app.models.transaction import Transaction
from app.models.goal import Goal
from app.models.upload_batch import UploadBatch
from app.models.decision_run import DecisionRun
from app.models.ai_interaction_log import AIInteractionLog
from sqlalchemy import delete

def main():
    settings = get_settings()

    # 1. Initialize Firebase Admin
    try:
        app = firebase_admin.get_app("finpilot-auth")
    except ValueError:
        options = {}
        if settings.firebase_project_id:
            options["projectId"] = settings.firebase_project_id

        if settings.firebase_service_account_json:
            print("Initializing Firebase using FIREBASE_SERVICE_ACCOUNT_JSON")
            cred = credentials.Certificate(json.loads(settings.firebase_service_account_json))
            app = firebase_admin.initialize_app(cred, options=options, name="finpilot-auth")
        elif settings.firebase_service_account_path:
            print(f"Initializing Firebase using path: {settings.firebase_service_account_path}")
            cred = credentials.Certificate(settings.firebase_service_account_path)
            app = firebase_admin.initialize_app(cred, options=options, name="finpilot-auth")
        else:
            print("Initializing Firebase using default credentials")
            app = firebase_admin.initialize_app(options=options, name="finpilot-auth")

    email = "demo@finpilot.ai"
    password = "FinPilot@2026"
    display_name = "Somnath Singh"

    old_uid = None
    # 2. Get and recreate demo user
    try:
        existing = auth.get_user_by_email(email, app=app)
        old_uid = existing.uid
        print(f"Deleting existing demo user with UID: {old_uid}")
        auth.delete_user(old_uid, app=app)
    except Exception as e:
        print(f"Note: No existing demo user to delete or check failed: {e}")

    new_user = auth.create_user(
        email=email,
        password=password,
        display_name=display_name,
        app=app
    )
    new_uid = new_user.uid
    print(f"Created new demo user with UID: {new_uid}")

    # 3. Clean and Seed Database
    db = SessionLocal()
    try:
        uids_to_clean = [new_uid]
        if old_uid:
            uids_to_clean.append(old_uid)

        for uid in uids_to_clean:
            db.execute(delete(Transaction).where(Transaction.user_id == uid))
            db.execute(delete(Goal).where(Goal.user_id == uid))
            db.execute(delete(UploadBatch).where(UploadBatch.user_id == uid))
            db.execute(delete(DecisionRun).where(DecisionRun.user_id == uid))
            db.execute(delete(AIInteractionLog).where(AIInteractionLog.user_id == uid))
        db.commit()
        print("Cleared database records for demo user(s).")

        print("Seeding new transactions, goals, and decision simulations...")
        seed_demo_data(db, new_uid)
        print("Demo account data seeded successfully!")
    except Exception as exc:
        db.rollback()
        print(f"Error seeding database: {exc}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
