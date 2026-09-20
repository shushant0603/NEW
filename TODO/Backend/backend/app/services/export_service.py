import io
import csv
import pandas as pd
from typing import List
from ..schemas import ForecastResponse

class ExportService:
    def export_forecast_to_csv(self, forecast_res: ForecastResponse) -> str:
        """Exports a ForecastResponse into CSV formatted string."""
        output = io.StringIO()
        writer = csv.writer(output)

        # Write metadata headers
        writer.writerow(["# Insurance Intelligence: Life Insurance New Business Forecasting Export"])
        writer.writerow(["# Level", forecast_res.level])
        writer.writerow(["# Insurer", forecast_res.insurer or "All / Industry"])
        writer.writerow(["# Category", forecast_res.category or "All Categories"])
        writer.writerow(["# Target", forecast_res.target])
        writer.writerow(["# Target Unit", forecast_res.target_unit])
        writer.writerow(["# Model Selected", forecast_res.selected_model])
        writer.writerow(["# Recommended Model", forecast_res.recommended_model])
        writer.writerow(["# Horizon", f"{forecast_res.horizon} Months"])
        writer.writerow([])  # Empty row separator

        # Write data table headers
        writer.writerow(["date", "display_date", "period_type", "value", "lower_bound_95", "upper_bound_95", "unit"])

        # Historical rows
        for h in forecast_res.historical_data:
            writer.writerow([
                h.date,
                h.display_date,
                "Historical",
                h.target_value,
                "",  # No bounds for actuals
                "",
                forecast_res.target_unit
            ])

        # Forecast rows
        for f in forecast_res.forecast_data:
            writer.writerow([
                f.date,
                f.display_date,
                "Forecast",
                f.point_forecast,
                f.lower_bound if f.lower_bound is not None else "",
                f.upper_bound if f.upper_bound is not None else "",
                forecast_res.target_unit
            ])

        return output.getvalue()

export_service = ExportService()
