import os
import sys
import traceback
from alembic.config import main

os.chdir(r"d:/Googlee/FinPilot AI Product Experience/backend")
print("starting alembic")
try:
    main(argv=["upgrade", "head"])
except Exception:
    traceback.print_exc()
    sys.exit(1)
