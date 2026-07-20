import csv
import datetime
import os
import random

# Create directory if not exists
os.makedirs("public/demo", exist_ok=True)

# Generate transaction data
start_date = datetime.date(2026, 1, 15)
end_date = datetime.date(2026, 7, 15)

merchants_rules = [
    # (Merchant Name, raw description, type, amount_range, probability_weight)
    ("Swiggy", "Swiggy Online Food Delivery", "debit", (150, 800), 10),
    ("Blinkit", "Blinkit Grocery Shopping", "debit", (300, 1500), 8),
    ("Amazon", "Amazon India Marketplace", "debit", (200, 4000), 6),
    ("Uber", "Uber Ride Sharing Service", "debit", (100, 600), 12),
    ("Zomato", "Zomato Restaurant Delivery", "debit", (200, 1000), 10),
    ("Netflix", "Netflix Monthly Streaming Subscription", "debit", (649, 649), 1), # Monthly recurring
    ("Spotify", "Spotify Music Premium Subscription", "debit", (119, 119), 1), # Monthly recurring
    ("Electricity Bill", "State Electricity Board Payment", "debit", (1500, 3500), 1), # Monthly recurring
    ("Rent", "House Rent Transfer to Landlord", "debit", (15000, 15000), 1), # Monthly recurring
    ("Fuel", "HPCL Fuel Station Petro", "debit", (500, 2000), 5),
    ("Pharmacy", "Apollo Pharmacy Biotech", "debit", (100, 1200), 4),
    ("Salary Credit", "Monthly Salary Credit - FinPilot Corp", "credit", (75000, 75000), 1), # Monthly recurring
    ("SIP Investment", "SIP Mutual Fund Investment Scheme", "debit", (5000, 5000), 1), # Monthly recurring
    ("ATM Withdrawal", "ATM Cash Withdrawal - HDFC Bank", "debit", (1000, 5000), 3),
]

# Build raw list of events across 180 days
transactions = []
current_balance = 45000.0  # Starting balance

# Step day by day
current_date = start_date
day_delta = datetime.timedelta(days=1)

# Sort weight list
total_weight = sum(m[4] for m in merchants_rules if m[0] not in ["Netflix", "Spotify", "Electricity Bill", "Rent", "Salary Credit", "SIP Investment"])

while current_date <= end_date:
    # Monthly recurring items on 1st of month
    if current_date.day == 1:
        # Salary Credit
        current_balance += 75000.0
        transactions.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "description": "Monthly Salary Credit - FinPilot Corp",
            "amount": 75000.0,
            "balance": current_balance
        })
        # Rent
        current_balance -= 15000.0
        transactions.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "description": "House Rent Transfer to Landlord",
            "amount": -15000.0,
            "balance": current_balance
        })
        # SIP Mutual Fund
        current_balance -= 5000.0
        transactions.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "description": "SIP Mutual Fund Investment Scheme",
            "amount": -5000.0,
            "balance": current_balance
        })
    
    # Monthly subscription items on 5th of month
    if current_date.day == 5:
        # Netflix
        current_balance -= 649.0
        transactions.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "description": "Netflix Monthly Streaming Subscription",
            "amount": -649.0,
            "balance": current_balance
        })
        # Spotify
        current_balance -= 119.0
        transactions.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "description": "Spotify Music Premium Subscription",
            "amount": -119.0,
            "balance": current_balance
        })
        # Electricity Bill
        elec_bill = round(random.uniform(1500.0, 3500.0), 2)
        current_balance -= elec_bill
        transactions.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "description": "State Electricity Board Payment",
            "amount": -elec_bill,
            "balance": round(current_balance, 2)
        })

    # Everyday random transactions (between 1 and 3 transactions per day)
    num_txs = random.choice([0, 1, 2, 3])
    for _ in range(num_txs):
        # Pick weight-based merchant
        r_val = random.uniform(0, total_weight)
        cumulative = 0
        selected_m = None
        for rule in merchants_rules:
            if rule[0] in ["Netflix", "Spotify", "Electricity Bill", "Rent", "Salary Credit", "SIP Investment"]:
                continue
            cumulative += rule[4]
            if r_val <= cumulative:
                selected_m = rule
                break
        
        if selected_m:
            min_a, max_a = selected_m[3]
            tx_amount = round(random.uniform(min_a, max_a), 2)
            if selected_m[2] == "debit":
                tx_amount = -tx_amount
            current_balance += tx_amount
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": selected_m[1],
                "amount": tx_amount,
                "balance": round(current_balance, 2)
            })

    current_date += day_delta

# Write to CSV
with open("public/demo/demo-transactions.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["date", "description", "amount", "balance"])
    for tx in transactions:
        writer.writerow([tx["date"], tx["description"], tx["amount"], tx["balance"]])

print(f"Generated {len(transactions)} transactions inside public/demo/demo-transactions.csv")
