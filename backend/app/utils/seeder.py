from datetime import date, timedelta
from decimal import Decimal
import random
from sqlalchemy.orm import Session

from app.models.upload_batch import UploadBatch
from app.models.transaction import Transaction
from app.models.goal import Goal
from app.models.decision_run import DecisionRun
from app.schemas.decision import DecisionRequest
from app.services.decision_engine import DecisionEngineService

def seed_demo_data(db: Session, user_id: str) -> None:
    # 1. Create a mock upload batch
    batch = UploadBatch(
        user_id=user_id,
        filename="demo_data.csv",
        source_format="generic",
        transaction_count=280,
    )
    db.add(batch)
    db.flush()

    # 2. Build list of transactions covering the last 12 months
    start_date = date(2025, 7, 4)
    end_date = date(2026, 7, 4)
    
    current_date = start_date
    running_balance = Decimal("250000.00")
    txs = []

    while current_date <= end_date:
        day_txs = []
        
        # On the 1st of the month: Salary Credit, Rent, and SIP
        if current_date.day == 1:
            running_balance += Decimal("120000.00")
            day_txs.append({
                "merchant": "Salary Credit",
                "raw_description": "Salary Credit from Employer",
                "category": "Income",
                "amount": Decimal("120000.00"),
                "transaction_type": "credit",
                "balance": running_balance
            })
            
            running_balance -= Decimal("30000.00")
            day_txs.append({
                "merchant": "Rent Payment",
                "raw_description": "Monthly apartment rent payment",
                "category": "Housing",
                "amount": Decimal("-30000.00"),
                "transaction_type": "debit",
                "balance": running_balance
            })
            
            running_balance -= Decimal("15000.00")
            day_txs.append({
                "merchant": "Mutual Fund SIP",
                "raw_description": "Mutual Fund Investment SIP",
                "category": "Investment",
                "amount": Decimal("-15000.00"),
                "transaction_type": "debit",
                "balance": running_balance
            })
        
        # On the 5th of the month: Bills & subscriptions
        if current_date.day == 5:
            running_balance -= Decimal("3500.00")
            day_txs.append({
                "merchant": "Electricity Bill",
                "raw_description": "State Electricity Board",
                "category": "Utilities",
                "amount": Decimal("-3500.00"),
                "transaction_type": "debit",
                "balance": running_balance
            })
            
            running_balance -= Decimal("800.00")
            day_txs.append({
                "merchant": "Water Bill",
                "raw_description": "Municipal Water Board",
                "category": "Utilities",
                "amount": Decimal("-800.00"),
                "transaction_type": "debit",
                "balance": running_balance
            })
            
            running_balance -= Decimal("1200.00")
            day_txs.append({
                "merchant": "Broadband Internet",
                "raw_description": "Airtel Fiber Broadband",
                "category": "Utilities",
                "amount": Decimal("-1200.00"),
                "transaction_type": "debit",
                "balance": running_balance
            })
            
            running_balance -= Decimal("649.00")
            day_txs.append({
                "merchant": "Netflix",
                "raw_description": "Netflix Entertainment Subscription",
                "category": "Entertainment",
                "amount": Decimal("-649.00"),
                "transaction_type": "debit",
                "balance": running_balance
            })
            
            running_balance -= Decimal("119.00")
            day_txs.append({
                "merchant": "Spotify",
                "raw_description": "Spotify Premium Music Subscription",
                "category": "Entertainment",
                "amount": Decimal("-119.00"),
                "transaction_type": "debit",
                "balance": running_balance
            })
            
            running_balance -= Decimal("299.00")
            day_txs.append({
                "merchant": "Amazon Prime",
                "raw_description": "Amazon Prime Monthly Membership",
                "category": "Entertainment",
                "amount": Decimal("-299.00"),
                "transaction_type": "debit",
                "balance": running_balance
            })

        # Weekly Groceries (every Saturday/Sunday)
        if current_date.weekday() in (5, 6):
            if current_date.weekday() == 5:
                amt = Decimal(str(random.randint(2200, 3800)))
                running_balance -= amt
                day_txs.append({
                    "merchant": "Reliance Fresh",
                    "raw_description": "Reliance Fresh Supermarket",
                    "category": "Groceries",
                    "amount": -amt,
                    "transaction_type": "debit",
                    "balance": running_balance
                })
            else:
                amt = Decimal(str(random.randint(600, 1100)))
                running_balance -= amt
                day_txs.append({
                    "merchant": "Blinkit",
                    "raw_description": "Blinkit Instant Groceries Delivery",
                    "category": "Groceries",
                    "amount": -amt,
                    "transaction_type": "debit",
                    "balance": running_balance
                })

        # Casual dining & delivery: 25% chance of Swiggy / Zomato on non-weekend/1st/5th
        if current_date.weekday() not in (5, 6) and current_date.day not in (1, 5):
            if random.random() < 0.25:
                amt = Decimal(str(random.randint(300, 750)))
                running_balance -= amt
                day_txs.append({
                    "merchant": "Swiggy",
                    "raw_description": "Swiggy Food Delivery",
                    "category": "Food",
                    "amount": -amt,
                    "transaction_type": "debit",
                    "balance": running_balance
                })
            elif random.random() < 0.25:
                amt = Decimal(str(random.randint(400, 850)))
                running_balance -= amt
                day_txs.append({
                    "merchant": "Zomato",
                    "raw_description": "Zomato Restaurant Delivery",
                    "category": "Food",
                    "amount": -amt,
                    "transaction_type": "debit",
                    "balance": running_balance
                })

        # Transport: Uber/Ola 35% chance
        if random.random() < 0.35:
            merchant = "Uber" if random.random() < 0.6 else "Ola"
            amt = Decimal(str(random.randint(220, 580)))
            running_balance -= amt
            day_txs.append({
                "merchant": merchant,
                "raw_description": f"{merchant} Cab Service Ride",
                "category": "Transport",
                "amount": -amt,
                "transaction_type": "debit",
                "balance": running_balance
            })

        # Shopping: Amazon 2-3 times a month
        if current_date.day in (10, 20, 28) and random.random() < 0.8:
            amt = Decimal(str(random.randint(1800, 5500)))
            running_balance -= amt
            day_txs.append({
                "merchant": "Amazon",
                "raw_description": "Amazon Online Marketplace",
                "category": "Shopping",
                "amount": -amt,
                "transaction_type": "debit",
                "balance": running_balance
            })

        # Medical: 6 times a year (roughly every 2 months)
        if current_date.day == 15 and current_date.month in (1, 3, 5, 7, 9, 11):
            amt = Decimal(str(random.randint(1200, 2800)))
            running_balance -= amt
            day_txs.append({
                "merchant": "Apollo Pharmacy",
                "raw_description": "Medicines and health supplies",
                "category": "Medical",
                "amount": -amt,
                "transaction_type": "debit",
                "balance": running_balance
            })

        # Travel: 3 times a year
        if current_date.day == 18 and current_date.month in (4, 8, 12):
            amt = Decimal(str(random.randint(8500, 14000)))
            running_balance -= amt
            day_txs.append({
                "merchant": "MakeMyTrip Flights",
                "raw_description": "Air Ticket Reservation",
                "category": "Travel",
                "amount": -amt,
                "transaction_type": "debit",
                "balance": running_balance
            })

        for t in day_txs:
            txs.append(
                Transaction(
                    user_id=user_id,
                    batch_id=batch.id,
                    date=current_date,
                    merchant=t["merchant"],
                    raw_description=t["raw_description"],
                    category=t["category"],
                    amount=t["amount"],
                    transaction_type=t["transaction_type"],
                    balance=t["balance"],
                    currency="INR",
                )
            )

        current_date += timedelta(days=1)

    db.add_all(txs)

    # 3. Create active financial goals
    goals = [
        Goal(
            user_id=user_id,
            name="Emergency Fund",
            target_amount=Decimal("150000.00"),
            current_amount=Decimal("150000.00"),
            deadline=date(2026, 9, 30),
            description="6 months of essential living expenses kept in high-yield liquid account.",
            status="active",
        ),
        Goal(
            user_id=user_id,
            name="Europe Trip",
            target_amount=Decimal("250000.00"),
            current_amount=Decimal("180000.00"),
            deadline=date(2026, 12, 31),
            description="Trip budget covering flights, accommodation, and daily activities in Western Europe.",
            status="active",
        ),
        Goal(
            user_id=user_id,
            name="Buy a Laptop",
            target_amount=Decimal("80000.00"),
            current_amount=Decimal("50000.00"),
            deadline=date(2026, 9, 30),
            description="New development machine (MacBook Air or Pro) for coding projects.",
            status="active",
        ),
        Goal(
            user_id=user_id,
            name="House Down Payment",
            target_amount=Decimal("10000000.00"),
            current_amount=Decimal("2000000.00"),
            deadline=date(2030, 12, 31),
            description="Long-term goal for purchasing a flat in Bengaluru.",
            status="active",
        ),
    ]
    db.add_all(goals)

    # 4. Simulate and seed decision runs
    current_savings = Decimal("250000.00")
    monthly_income = Decimal("120000.00")
    monthly_expenses = Decimal("100000.00")
    existing_goal_target = Decimal("10480000.00")
    existing_goal_current = Decimal("2380000.00")

    decisions_to_seed = [
        {
            "scenario_type": "laptop",
            "label": "Buy a MacBook Pro",
            "purchase_amount": Decimal("220000.00"),
            "down_payment": Decimal("220000.00"),
            "recurring_monthly_cost": Decimal("0.00"),
            "financing_months": 0,
            "annual_interest_rate": 0.0,
            "notes": "Top-end MacBook Pro for programming and local AI model development."
        },
        {
            "scenario_type": "phone",
            "label": "Purchase an iPhone",
            "purchase_amount": Decimal("140000.00"),
            "down_payment": Decimal("40000.00"),
            "recurring_monthly_cost": Decimal("0.00"),
            "financing_months": 12,
            "annual_interest_rate": 12.0,
            "notes": "Upgrade current mobile phone to the latest iPhone with 12 months EMI."
        },
        {
            "scenario_type": "custom",
            "label": "Move to Bengaluru",
            "purchase_amount": Decimal("50000.00"),
            "down_payment": Decimal("50000.00"),
            "recurring_monthly_cost": Decimal("15000.00"),
            "financing_months": 0,
            "annual_interest_rate": 0.0,
            "notes": "Security deposit and initial relocation costs. Expecting rent increase of 15K monthly."
        },
        {
            "scenario_type": "car",
            "label": "Buy a Used Car",
            "purchase_amount": Decimal("450000.00"),
            "down_payment": Decimal("150000.00"),
            "recurring_monthly_cost": Decimal("5000.00"),
            "financing_months": 36,
            "annual_interest_rate": 9.5,
            "notes": "Used sedan for weekend travel and highway trips. 5K recurring includes fuel and maintenance."
        },
        {
            "scenario_type": "custom",
            "label": "Increase SIP Investment",
            "purchase_amount": Decimal("10000.00"),
            "down_payment": Decimal("0.00"),
            "recurring_monthly_cost": Decimal("10000.00"),
            "financing_months": 0,
            "annual_interest_rate": 0.0,
            "notes": "Increasing mutual fund SIP allocation by an additional 10K per month."
        },
        {
            "scenario_type": "custom",
            "label": "Take an Education Loan",
            "purchase_amount": Decimal("8000000.00"),
            "down_payment": Decimal("0.00"),
            "recurring_monthly_cost": Decimal("0.00"),
            "financing_months": 120,
            "annual_interest_rate": 8.5,
            "notes": "Higher education loan for executive MBA program."
        }
    ]

    engine = DecisionEngineService()
    decision_runs = []
    for d in decisions_to_seed:
        req = DecisionRequest(
            scenario_type=d["scenario_type"],
            label=d["label"],
            purchase_amount=d["purchase_amount"],
            down_payment=d["down_payment"],
            recurring_monthly_cost=d["recurring_monthly_cost"],
            financing_months=d["financing_months"],
            annual_interest_rate=d["annual_interest_rate"],
            current_savings=current_savings,
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            existing_goal_target=existing_goal_target,
            existing_goal_current=existing_goal_current,
            timeframe_months=12,
            notes=d["notes"]
        )
        sim = engine.simulate(req)
        decision_runs.append(
            DecisionRun(
                user_id=user_id,
                scenario_type=d["scenario_type"],
                label=d["label"],
                summary=sim.summary,
                input_payload=req.model_dump(mode="json"),
                result_payload={
                    "recommendation": sim.recommendation,
                    "metrics": sim.metrics.model_dump(mode="json"),
                    "before": {k: float(v) if isinstance(v, Decimal) else v for k, v in sim.before.items()},
                    "after": {k: float(v) if isinstance(v, Decimal) else v for k, v in sim.after.items()},
                    "alternatives": sim.alternatives,
                    "insights": [insight.model_dump(mode="json") for insight in sim.insights],
                }
            )
        )
    db.add_all(decision_runs)
    db.commit()
