import re
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from typing import Optional, Tuple

MONTH_NAME_MAP = {
    "january": 1, "jan": 1, "01": 1, "1": 1,
    "february": 2, "feb": 2, "02": 2, "2": 2,
    "march": 3, "mar": 3, "03": 3, "3": 3,
    "april": 4, "apr": 4, "04": 4, "4": 4,
    "may": 5, "05": 5, "5": 5,
    "june": 6, "jun": 6, "06": 6, "6": 6,
    "july": 7, "jul": 7, "07": 7, "7": 7,
    "august": 8, "aug": 8, "08": 8, "8": 8,
    "september": 9, "sep": 9, "sept": 9, "09": 9, "9": 9,
    "october": 10, "oct": 10, "10": 10,
    "november": 11, "nov": 11, "11": 11,
    "december": 12, "dec": 12, "12": 12
}

def parse_month(val) -> Optional[int]:
    if val is None:
        return None
    s = str(val).strip().lower()
    if s in MONTH_NAME_MAP:
        return MONTH_NAME_MAP[s]
    # Try parsing numeric from string
    try:
        n = int(float(s))
        if 1 <= n <= 12:
            return n
    except ValueError:
        pass
    return None

def parse_year(val) -> Optional[int]:
    if val is None:
        return None
    s = str(val).strip()
    # Match 4 digit year or FY pattern like 2023-24
    fy_match = re.match(r"^(\d{4})[-/]\d{2,4}$", s)
    if fy_match:
        return int(fy_match.group(1))
    try:
        y = int(float(s))
        if 1990 <= y <= 2100:
            return y
    except ValueError:
        pass
    return None

def parse_date_to_monthly_iso(month_val, year_val) -> Optional[str]:
    m = parse_month(month_val)
    y = parse_year(year_val)
    if m and y:
        return f"{y:04d}-{m:02d}-01"
    return None

def add_months_to_iso(iso_str: str, n: int) -> str:
    """Adds n months to an ISO format YYYY-MM-01 string."""
    dt = datetime.strptime(iso_str, "%Y-%m-%d").date()
    new_dt = dt + relativedelta(months=n)
    return new_dt.strftime("%Y-%m-%d")

def generate_future_dates(last_iso_date: str, horizon: int) -> list[str]:
    """Generate sequential future monthly dates continuing strictly after last_iso_date."""
    dt = datetime.strptime(last_iso_date, "%Y-%m-%d").date()
    future_dates = []
    for i in range(1, horizon + 1):
        next_dt = dt + relativedelta(months=i)
        future_dates.append(next_dt.strftime("%Y-%m-%d"))
    return future_dates

def format_display_month(iso_str: str) -> str:
    try:
        dt = datetime.strptime(iso_str, "%Y-%m-%d")
        return dt.strftime("%b %Y")
    except Exception:
        return iso_str
