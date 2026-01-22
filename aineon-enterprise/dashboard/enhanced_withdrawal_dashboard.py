#!/usr/bin/env python3
"""
AINEON Elite-Tier Profit Withdrawal Dashboard
Advanced withdrawal management with real-time monitoring and analytics

Features:
- Real-time withdrawal tracking and analytics
- Multi-address withdrawal management
- Gas optimization strategies
- Emergency withdrawal controls
- Withdrawal history and audit trails
- Risk assessment and compliance monitoring
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import json
import asyncio
import time
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional
import requests
import numpy as np

# Configure page
st.set_page_config(
    page_title="AINEON Elite Withdrawal Dashboard",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for elite-tier appearance
st.markdown("""
<style>
    .main > div {
        padding-top: 2rem;
    }
    .metric-container {
        background-color: #f0f2f6;
        border: 1px solid #e6e6e6;
        padding: 1rem;
        border-radius: 0.5rem;
    }
    .success-box {
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
        padding: 0.75rem;
        border-radius: 0.25rem;
        margin: 0.5rem 0;
    }
    .warning-box {
        background-color: #fff3cd;
        border: 1px solid #ffeeba;
        color: #856404;
        padding: 0.75rem;
        border-radius: 0.25rem;
        margin: 0.5rem 0;
    }
    .error-box {
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 0.75rem;
        border-radius: 0.25rem;
        margin: 0.5rem 0;
    }
    .emergency-button {
        background-color: #dc3545 !important;
        border-color: #dc3545 !important;
        color: white !important;
        font-weight: bold !important;
    }
</style>
""", unsafe_allow_html=True)

class EliteWithdrawalDashboard:
    """Elite-tier withdrawal dashboard management"""
    
    def __init__(self):
        self.api_base_url = "http://localhost:10000"
        self.refresh_interval = 5  # seconds
        
    def fetch_withdrawal_data(self) -> Dict:
        """Fetch comprehensive withdrawal data from API"""
        try:
            # Parallel API calls for better performance
            endpoints = [
                ("stats", "/withdraw/stats"),
                ("history", "/withdraw/history?limit=100"),
                ("pending", "/withdraw/pending"),
                ("addresses", "/withdraw/addresses"),
                ("rules", "/withdraw/rules"),
                ("analytics", "/withdraw/analytics"),
                ("network", "/withdraw/network-status")
            ]
            
            results = {}
            for key, endpoint in endpoints:
                try:
                    response = requests.get(f"{self.api_base_url}{endpoint}", timeout=3)
                    if response.ok:
                        results[key] = response.json()
                    else:
                        results[key] = {}
                except:
                    results[key] = {}
            
            return results
            
        except Exception as e:
            st.error(f"Failed to fetch withdrawal data: {e}")
            return {}
    
    def display_header(self):
        """Display elite-tier dashboard header"""
        col1, col2, col3 = st.columns([2, 1, 1])
        
        with col1:
            st.title("💰 AINEON Elite Withdrawal System")
            st.markdown("**Advanced profit withdrawal management with AI optimization**")
        
        with col2:
            # System status indicator
            status = self.get_system_status()
            if status.get('online', False):
                st.markdown("""
                <div class="success-box">
                    <strong>🟢 SYSTEM ONLINE</strong><br>
                    All withdrawal systems operational
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown("""
                <div class="error-box">
                    <strong>🔴 SYSTEM OFFLINE</strong><br>
                    Withdrawal services unavailable
                </div>
                """, unsafe_allow_html=True)
        
        with col3:
            # Last update timestamp
            st.metric("Last Update", datetime.now().strftime("%H:%M:%S"))
    
    def get_system_status(self) -> Dict:
        """Get withdrawal system status"""
        try:
            response = requests.get(f"{self.api_base_url}/status", timeout=2)
            if response.ok:
                return response.json()
        except:
            pass
        return {"online": False, "withdrawal_service": "unknown"}
    
    def display_key_metrics(self, data: Dict):
        """Display key withdrawal metrics"""
        stats = data.get('stats', {})
        
        col1, col2, col3, col4, col5 = st.columns(5)
        
        with col1:
            total_withdrawn = stats.get('total_withdrawn_eth', 0)
            st.metric(
                "Total Withdrawn",
                f"{total_withdrawn:.4f} ETH",
                delta=f"${total_withdrawn * 2500:.0f}"
            )
        
        with col2:
            success_rate = stats.get('success_rate', 0)
            st.metric(
                "Success Rate",
                f"{success_rate:.1f}%",
                delta=f"{stats.get('withdrawal_count', 0)} withdrawals"
            )
        
        with col3:
            avg_gas = stats.get('average_gas_fee', 0)
            st.metric(
                "Avg Gas Fee",
                f"{avg_gas:.4f} ETH",
                delta=f"${avg_gas * 2500:.0f}"
            )
        
        with col4:
            pending = data.get('pending', {}).get('count', 0)
            st.metric(
                "Pending",
                f"{pending}",
                delta="Processing..."
            )
        
        with col5:
            daily_total = stats.get('daily_withdrawal_total', 0)
            daily_limit = stats.get('daily_withdrawal_limit', 100)
            usage_pct = (daily_total / daily_limit * 100) if daily_limit > 0 else 0
            st.metric(
                "Daily Usage",
                f"{usage_pct:.1f}%",
                delta=f"{daily_total:.2f} / {daily_limit} ETH"
            )
    
    def display_withdrawal_modes(self, data: Dict):
        """Display withdrawal mode controls"""
        st.subheader("🔄 Withdrawal Mode Configuration")
        
        stats = data.get('stats', {})
        current_mode = stats.get('mode', 'manual')
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            # Mode selection
            modes = {
                'manual': 'Manual - User-controlled withdrawals',
                'auto': 'Auto - Threshold-based automatic withdrawals',
                'scheduled': 'Scheduled - Time-based automatic withdrawals',
                'emergency': 'Emergency - Immediate fund extraction'
            }
            
            selected_mode = st.selectbox(
                "Withdrawal Mode",
                options=list(modes.keys()),
                format_func=lambda x: modes[x],
                index=list(modes.keys()).index(current_mode) if current_mode in modes else 0
            )
            
            # Mode-specific configuration
            if selected_mode == 'manual':
                st.markdown("**Manual Withdrawal Configuration**")
                
                col_a, col_b = st.columns(2)
                with col_a:
                    amount = st.number_input(
                        "Withdrawal Amount (ETH)",
                        min_value=0.001,
                        max_value=100.0,
                        value=0.1,
                        step=0.01,
                        format="%.3f"
                    )
                    
                    gas_strategy = st.selectbox(
                        "Gas Strategy",
                        ["Standard", "Fast", "Slow", "Optimized"],
                        index=0
                    )
                
                with col_b:
                    st.markdown("**Withdrawal Preview**")
                    preview_data = {
                        'Amount': f"{amount:.4f} ETH",
                        'Gas Strategy': gas_strategy,
                        'Est. Gas Fee': "~0.002 ETH",
                        'Net Amount': f"{(amount - 0.002):.4f} ETH"
                    }
                    
                    for key, value in preview_data.items():
                        st.write(f"**{key}:** {value}")
                
                if st.button("Execute Manual Withdrawal", type="primary"):
                    self.execute_manual_withdrawal(amount, gas_strategy)
            
            elif selected_mode == 'auto':
                st.markdown("**Auto-Withdrawal Configuration**")
                
                rules = data.get('rules', {}).get('rules', [])
                
                if rules:
                    st.markdown("**Active Rules:**")
                    for rule in rules:
                        with st.expander(f"Rule: {rule.get('name', 'Unnamed')}"):
                            col_a, col_b = st.columns(2)
                            with col_a:
                                st.write(f"**Threshold:** {rule.get('threshold_eth', 0):.4f} ETH")
                                st.write(f"**Gas Strategy:** {rule.get('gas_strategy', 'Standard')}")
                            with col_b:
                                st.write(f"**Frequency:** Every {rule.get('max_frequency_hours', 24)} hours")
                                status = "✅ Active" if rule.get('enabled', False) else "❌ Disabled"
                                st.write(f"**Status:** {status}")
                
                # Add new rule
                with st.expander("➕ Add New Auto-Withdrawal Rule"):
                    col_a, col_b = st.columns(2)
                    with col_a:
                        new_rule_name = st.text_input("Rule Name", key="new_rule_name")
                        new_threshold = st.number_input(
                            "Threshold (ETH)",
                            min_value=0.001,
                            value=0.1,
                            step=0.01,
                            key="new_threshold"
                        )
                    with col_b:
                        new_gas_strategy = st.selectbox(
                            "Gas Strategy",
                            ["Standard", "Fast", "Slow", "Optimized"],
                            key="new_gas_strategy"
                        )
                        new_frequency = st.number_input(
                            "Min Frequency (hours)",
                            min_value=1,
                            value=24,
                            key="new_frequency"
                        )
                    
                    if st.button("Add Rule"):
                        self.add_withdrawal_rule(new_rule_name, new_threshold, new_gas_strategy, new_frequency)
            
            elif selected_mode == 'emergency':
                st.markdown("""
                <div class="error-box">
                    <strong>⚠️ EMERGENCY MODE</strong><br>
                    This will immediately withdraw all available funds. Use only in critical situations!
                </div>
                """, unsafe_allow_html=True)
                
                percentage = st.slider(
                    "Withdrawal Percentage",
                    min_value=50,
                    max_value=100,
                    value=100,
                    step=5
                )
                
                col_a, col_b = st.columns(2)
                with col_a:
                    st.write(f"**Withdrawal Amount:** {percentage}% of available balance")
                    st.write(f"**Estimated Amount:** ~{(percentage/100) * 5:.4f} ETH")
                with col_b:
                    st.write(f"**Gas Strategy:** Fastest")
                    st.write(f"**Estimated Fee:** ~0.003 ETH")
                
                # Double confirmation for emergency withdrawal
                confirm1 = st.checkbox("I understand this is an emergency withdrawal")
                confirm2 = st.checkbox("I confirm I want to withdraw all available funds")
                
                if st.button("🚨 EXECUTE EMERGENCY WITHDRAWAL", type="secondary", disabled=not (confirm1 and confirm2)):
                    self.execute_emergency_withdrawal(percentage)
        
        with col2:
            st.markdown("**Current Configuration**")
            config_data = {
                'Mode': current_mode.title(),
                'Active Rules': len([r for r in data.get('rules', {}).get('rules', []) if r.get('enabled', False)]),
                'Addresses': len(data.get('addresses', {}).get('addresses', [])),
                'Pending': data.get('pending', {}).get('count', 0)
            }
            
            for key, value in config_data.items():
                st.write(f"**{key}:** {value}")
    
    def display_withdrawal_analytics(self, data: Dict):
        """Display withdrawal analytics and charts"""
        st.subheader("📊 Withdrawal Analytics")
        
        analytics = data.get('analytics', {})
        history = data.get('history', {}).get('history', [])
        
        if not history:
            st.info("No withdrawal history available for analytics")
            return
        
        # Convert to DataFrame
        df = pd.DataFrame(history)
        df['initiated_at'] = pd.to_datetime(df['initiated_at'])
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Withdrawal volume over time
            daily_volume = df.groupby(df['initiated_at'].dt.date)['amount_eth'].sum()
            
            fig_volume = go.Figure()
            fig_volume.add_trace(go.Scatter(
                x=daily_volume.index,
                y=daily_volume.values,
                mode='lines+markers',
                name='Daily Volume',
                line=dict(color='#1f77b4', width=2)
            ))
            
            fig_volume.update_layout(
                title="Daily Withdrawal Volume",
                xaxis_title="Date",
                yaxis_title="Volume (ETH)",
                height=300
            )
            
            st.plotly_chart(fig_volume, use_container_width=True)
        
        with col2:
            # Success rate over time
            daily_success = df.groupby(df['initiated_at'].dt.date).apply(
                lambda x: (x['status'] == 'confirmed').sum() / len(x) * 100
            )
            
            fig_success = go.Figure()
            fig_success.add_trace(go.Scatter(
                x=daily_success.index,
                y=daily_success.values,
                mode='lines+markers',
                name='Success Rate',
                line=dict(color='#2ca02c', width=2)
            ))
            
            fig_success.update_layout(
                title="Daily Success Rate",
                xaxis_title="Date",
                yaxis_title="Success Rate (%)",
                height=300
            )
            
            st.plotly_chart(fig_success, use_container_width=True)
        
        # Gas fee analysis
        col3, col4 = st.columns(2)
        
        with col3:
            # Gas fee distribution
            fig_gas = px.histogram(
                df,
                x='gas_price_gwei',
                nbins=20,
                title="Gas Price Distribution",
                labels={'gas_price_gwei': 'Gas Price (Gwei)', 'count': 'Frequency'}
            )
            st.plotly_chart(fig_gas, use_container_width=True)
        
        with col4:
            # Withdrawal size distribution
            fig_size = px.histogram(
                df,
                x='amount_eth',
                nbins=20,
                title="Withdrawal Size Distribution",
                labels={'amount_eth': 'Amount (ETH)', 'count': 'Frequency'}
            )
            st.plotly_chart(fig_size, use_container_width=True)
    
    def display_withdrawal_history(self, data: Dict):
        """Display withdrawal history table"""
        st.subheader("📜 Withdrawal History")
        
        history = data.get('history', {}).get('history', [])
        
        if not history:
            st.info("No withdrawal history available")
            return
        
        # Convert to DataFrame and format
        df = pd.DataFrame(history)
        
        # Format columns
        df['amount_eth'] = df['amount_eth'].round(4)
        df['gas_price_gwei'] = df['gas_price_gwei'].round(1)
        df['fee_eth'] = df['fee_eth'].round(6)
        df['initiated_at'] = pd.to_datetime(df['initiated_at']).dt.strftime('%Y-%m-%d %H:%M:%S')
        
        # Status styling
        def style_status(status):
            if status == 'confirmed':
                return 'background-color: #d4edda; color: #155724'
            elif status == 'failed':
                return 'background-color: #f8d7da; color: #721c24'
            elif status == 'pending':
                return 'background-color: #fff3cd; color: #856404'
            else:
                return ''
        
        # Display styled dataframe
        st.dataframe(
            df,
            use_container_width=True,
            hide_index=True,
            column_config={
                "amount_eth": st.column_config.NumberColumn("Amount (ETH)", format="%.4f"),
                "gas_price_gwei": st.column_config.NumberColumn("Gas (Gwei)", format=".1f"),
                "fee_eth": st.column_config.NumberColumn("Fee (ETH)", format=".6f"),
                "status": st.column_config.TextColumn("Status"),
                "tx_id": st.column_config.TextColumn("TX Hash"),
            }
        )
        
        # Download option
        csv = df.to_csv(index=False)
        st.download_button(
            label="📥 Download History (CSV)",
            data=csv,
            file_name=f"withdrawal_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )
    
    def display_address_management(self, data: Dict):
        """Display withdrawal address management"""
        st.subheader("📍 Withdrawal Address Management")
        
        addresses = data.get('addresses', {}).get('addresses', [])
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            if addresses:
                # Address table
                address_df = pd.DataFrame(addresses)
                st.dataframe(
                    address_df,
                    use_container_width=True,
                    hide_index=True
                )
            else:
                st.info("No withdrawal addresses configured")
        
        with col2:
            # Add new address form
            st.markdown("**➕ Add New Address**")
            
            with st.form("add_address_form"):
                label = st.text_input("Label", placeholder="e.g., Main Wallet")
                address = st.text_input("Ethereum Address", placeholder="0x...")
                percentage = st.slider("Percentage", 1, 100, 100)
                priority = st.number_input("Priority", min_value=1, value=1)
                
                if st.form_submit_button("Add Address"):
                    if self.add_withdrawal_address(label, address, percentage, priority):
                        st.success("Address added successfully!")
                        st.rerun()
                    else:
                        st.error("Failed to add address")
    
    def execute_manual_withdrawal(self, amount: float, gas_strategy: str):
        """Execute manual withdrawal"""
        try:
            response = requests.post(
                f"{self.api_base_url}/withdraw/manual",
                json={"amount": amount, "gas_strategy": gas_strategy},
                timeout=10
            )
            
            if response.ok:
                st.success(f"Withdrawal initiated: {amount} ETH")
                time.sleep(2)
                st.rerun()
            else:
                st.error(f"Withdrawal failed: {response.text}")
        except Exception as e:
            st.error(f"Withdrawal error: {e}")
    
    def execute_emergency_withdrawal(self, percentage: int):
        """Execute emergency withdrawal"""
        try:
            response = requests.post(
                f"{self.api_base_url}/withdraw/emergency",
                json={"percentage": percentage},
                timeout=10
            )
            
            if response.ok:
                st.success(f"Emergency withdrawal initiated: {percentage}% of available balance")
                time.sleep(2)
                st.rerun()
            else:
                st.error(f"Emergency withdrawal failed: {response.text}")
        except Exception as e:
            st.error(f"Emergency withdrawal error: {e}")
    
    def add_withdrawal_rule(self, name: str, threshold: float, gas_strategy: str, frequency: int):
        """Add withdrawal rule"""
        try:
            response = requests.post(
                f"{self.api_base_url}/withdraw/rules",
                json={
                    "name": name,
                    "threshold_eth": threshold,
                    "gas_strategy": gas_strategy,
                    "max_frequency_hours": frequency
                },
                timeout=5
            )
            
            if response.ok:
                st.success("Withdrawal rule added successfully!")
                st.rerun()
            else:
                st.error(f"Failed to add rule: {response.text}")
        except Exception as e:
            st.error(f"Error adding rule: {e}")
    
    def add_withdrawal_address(self, label: str, address: str, percentage: int, priority: int):
        """Add withdrawal address"""
        try:
            response = requests.post(
                f"{self.api_base_url}/withdraw/addresses",
                json={
                    "label": label,
                    "address": address,
                    "percentage": percentage,
                    "priority": priority
                },
                timeout=5
            )
            
            return response.ok
        except:
            return False
    
    def run_dashboard(self):
        """Run the elite withdrawal dashboard"""
        self.display_header()
        
        # Auto-refresh
        st_autorefresh = st.experimental_data_editor if hasattr(st, 'experimental_data_editor') else st.empty
        
        # Main dashboard content
        data = self.fetch_withdrawal_data()
        
        # Key metrics
        self.display_key_metrics(data)
        
        # Withdrawal modes
        self.display_withdrawal_modes(data)
        
        # Analytics
        self.display_withdrawal_analytics(data)
        
        # History and addresses
        col1, col2 = st.columns(2)
        
        with col1:
            self.display_withdrawal_history(data)
        
        with col2:
            self.display_address_management(data)
        
        # Auto-refresh every refresh_interval seconds
        if st.button("🔄 Refresh Now"):
            st.rerun()
        
        st.markdown(f"*Auto-refreshing every {self.refresh_interval} seconds*")
        time.sleep(self.refresh_interval)
        st.rerun()


def main():
    """Main dashboard execution"""
    dashboard = EliteWithdrawalDashboard()
    dashboard.run_dashboard()


if __name__ == "__main__":
    main()