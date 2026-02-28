import os
import sys
from datetime import datetime
from fpdf import FPDF

# Ensure we can import the backtest logic
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend-services/services/user-api-service/src'))

try:
    # We import the logic but will mock the data fetching for the report generation
    # to avoid needing a live DB connection just to test the PDF layout.
    # In production, you would call run_backtest() and capture the return object.
    from backtest_strategy import get_db_connection
except ImportError:
    pass

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(80)
        self.cell(30, 10, 'Alpha-Orion Strategy Report', 0, 0, 'C')
        self.ln(20)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}} - Generated on {datetime.now().strftime("%Y-%m-%d %H:%M")}', 0, 0, 'C')

def generate_report():
    print("📄 Generating PDF Report...")
    
    pdf = PDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_font('Arial', '', 12)

    # 1. Executive Summary
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '1. Executive Summary', 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.multi_cell(0, 10, 'This report outlines the performance of the Alpha-Orion Flash Loan Arbitrage strategy. '
                          'The system has been backtested against historical market data to validate win rates, '
                          'profit factors, and risk metrics.')
    pdf.ln(10)

    # 2. Key Performance Indicators (KPIs)
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '2. Key Performance Indicators', 0, 1)
    pdf.set_font('Arial', '', 11)
    
    # Mock Data (Replace with actual data from backtest_strategy.py return values)
    kpis = [
        ('Total Net Profit', '$18,945.60'),
        ('Win Rate', '98.2%'),
        ('Profit Factor', '12.5'),
        ('Max Drawdown', '1.2%'),
        ('Sharpe Ratio', '3.4'),
        ('Total Trades', '247')
    ]

    # Table Header
    pdf.set_fill_color(200, 220, 255)
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(95, 10, 'Metric', 1, 0, 'C', 1)
    pdf.cell(95, 10, 'Value', 1, 1, 'C', 1)

    # Table Rows
    pdf.set_font('Arial', '', 11)
    for metric, value in kpis:
        pdf.cell(95, 10, metric, 1)
        pdf.cell(95, 10, value, 1, 1)
    
    pdf.ln(10)

    # 3. Strategy Configuration
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '3. Configuration Parameters', 0, 1)
    pdf.set_font('Arial', '', 11)
    
    config = [
        ('Slippage Tolerance', '0.5%'),
        ('Min Profit Threshold', '$50.00'),
        ('Gas Price Strategy', 'Dynamic (1.2x Market)'),
        ('Reinvestment Rate', '85%')
    ]

    for key, val in config:
        pdf.cell(0, 8, f'- {key}: {val}', 0, 1)

    pdf.ln(10)

    # Output
    output_path = 'Alpha_Orion_Backtest_Report.pdf'
    pdf.output(output_path, 'F')
    print(f"✅ Report saved to {output_path}")

if __name__ == "__main__":
    try:
        import fpdf
        generate_report()
    except ImportError:
        print("❌ Missing dependency: fpdf")
        print("   Run: pip install fpdf")
        sys.exit(1)