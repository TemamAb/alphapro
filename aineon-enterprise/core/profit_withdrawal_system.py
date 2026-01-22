#!/usr/bin/env python3
"""
AINEON Enterprise Profit Withdrawal System
Centralized profit collection, management, and withdrawal system

Addresses audit findings:
- Centralized profit collection system
- Comprehensive error handling and recovery
- Consistent configuration management
- Contract version management
- Enterprise monitoring and alerting

Author: AINEON Enterprise Architecture Team
"""

import asyncio
import logging
import json
import time
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_DOWN
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import secrets

from web3 import Web3
from web3.contract import Contract
from web3.exceptions import ContractLogicError, TransactionNotFound
import requests
from eth_account import Account
from eth_account.signers.local import LocalAccount

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class WithdrawalMode(Enum):
    """Withdrawal operation modes"""
    MANUAL = "manual"
    AUTO = "auto"
    SCHEDULED = "scheduled"
    EMERGENCY = "emergency"


class WithdrawalStatus(Enum):
    """Withdrawal transaction status"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class GasStrategy(Enum):
    """Gas price optimization strategies"""
    STANDARD = "standard"
    FAST = "fast"
    SLOW = "slow"
    OPTIMIZED = "optimized"


@dataclass
class WithdrawalAddress:
    """Withdrawal address configuration"""
    address: str
    label: str
    percentage: float
    priority: int
    enabled: bool = True
    last_used: Optional[datetime] = None
    total_withdrawn: Decimal = Decimal('0')


@dataclass
class WithdrawalRule:
    """Auto-withdrawal rule configuration"""
    id: str
    name: str
    threshold_eth: Decimal
    gas_strategy: GasStrategy
    max_frequency_hours: int
    enabled: bool = True
    last_triggered: Optional[datetime] = None
    trigger_count: int = 0


@dataclass
class WithdrawalTransaction:
    """Withdrawal transaction record"""
    id: str
    mode: WithdrawalMode
    amount_eth: Decimal
    gas_price_gwei: Decimal
    gas_used: Optional[int]
    fee_eth: Optional[Decimal]
    status: WithdrawalStatus
    tx_hash: Optional[str]
    from_address: str
    to_address: str
    initiated_at: datetime
    confirmed_at: Optional[datetime]
    error_message: Optional[str] = None
    retry_count: int = 0
    rule_id: Optional[str] = None


@dataclass
class ContractVersion:
    """Smart contract version information"""
    name: str
    address: str
    version: str
    abi_hash: str
    last_verified: datetime
    is_active: bool = True


class ProfitWithdrawalSystem:
    """
    Enterprise-grade profit withdrawal system with centralized collection,
    comprehensive error handling, and monitoring capabilities.
    """

    def __init__(self, config_path: str = "withdrawal_config.json"):
        self.config_path = config_path
        self.config = self._load_config()

        # Initialize Web3 connection
        self.w3 = Web3(Web3.HTTPProvider(self.config['rpc_url']))

        # Load wallet and contract configurations
        self._load_wallet_config()
        self._load_contract_versions()

        # Initialize collections
        self.addresses: Dict[str, WithdrawalAddress] = {}
        self.rules: Dict[str, WithdrawalRule] = {}
        self.transactions: List[WithdrawalTransaction] = []

        # Monitoring and health
        self.health_status = {
            'last_check': datetime.now(),
            'rpc_connected': False,
            'wallet_balance': Decimal('0'),
            'pending_withdrawals': 0,
            'failed_withdrawals': 0,
            'total_withdrawn': Decimal('0')
        }

        # Initialize system
        self._initialize_system()

    def _load_config(self) -> Dict[str, Any]:
        """Load centralized configuration"""
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            logger.info(f"Configuration loaded from {self.config_path}")
            return config
        except FileNotFoundError:
            logger.warning(f"Config file {self.config_path} not found, using defaults")
            return self._get_default_config()
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return self._get_default_config()

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            'rpc_url': 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
            'chain_id': 1,
            'gas_reserve_eth': 0.1,
            'max_retry_attempts': 3,
            'retry_delay_seconds': 60,
            'monitoring_interval': 30,
            'alert_thresholds': {
                'max_pending_withdrawals': 5,
                'max_failed_withdrawals': 3,
                'min_wallet_balance': 0.5
            },
            'security': {
                'max_daily_withdrawal': 100.0,
                'max_single_withdrawal': 10.0,
                'require_2fa': True
            }
        }

    def _load_wallet_config(self):
        """Load wallet configuration securely"""
        try:
            # In production, use secure key management
            self.wallet_address = self.config.get('wallet_address')
            self.private_key = self.config.get('private_key')  # Encrypted in production
            self.account: LocalAccount = Account.from_key(self.private_key) if self.private_key else None

            if self.account and self.account.address != self.wallet_address:
                raise ValueError("Wallet address mismatch")

            logger.info(f"Wallet configured: {self.wallet_address[:10]}...")

        except Exception as e:
            logger.error(f"Wallet configuration error: {e}")
            raise

    def _load_contract_versions(self):
        """Load and validate contract versions"""
        self.contract_versions: Dict[str, ContractVersion] = {}

        # Load known contract versions
        contracts_config = self.config.get('contracts', {})

        for name, info in contracts_config.items():
            version = ContractVersion(
                name=name,
                address=info['address'],
                version=info['version'],
                abi_hash=hashlib.sha256(json.dumps(info['abi']).encode()).hexdigest(),
                last_verified=datetime.fromisoformat(info['last_verified']),
                is_active=info.get('is_active', True)
            )
            self.contract_versions[name] = version

        logger.info(f"Loaded {len(self.contract_versions)} contract versions")

    def _initialize_system(self):
        """Initialize the withdrawal system"""
        try:
            # Test RPC connection
            if self.w3.is_connected():
                self.health_status['rpc_connected'] = True
                logger.info("RPC connection established")
            else:
                raise ConnectionError("RPC connection failed")

            # Load withdrawal addresses and rules
            self._load_addresses()
            self._load_rules()

            # Start monitoring
            asyncio.create_task(self._monitoring_loop())

            logger.info("Profit withdrawal system initialized successfully")

        except Exception as e:
            logger.error(f"System initialization failed: {e}")
            raise

    def _load_addresses(self):
        """Load withdrawal addresses from storage"""
        # In production, load from database
        addresses_data = self.config.get('addresses', [])
        for addr_data in addresses_data:
            address = WithdrawalAddress(**addr_data)
            self.addresses[address.address] = address

        logger.info(f"Loaded {len(self.addresses)} withdrawal addresses")

    def _load_rules(self):
        """Load withdrawal rules from storage"""
        # In production, load from database
        rules_data = self.config.get('rules', [])
        for rule_data in rules_data:
            rule = WithdrawalRule(**rule_data)
            self.rules[rule.id] = rule

        logger.info(f"Loaded {len(self.rules)} withdrawal rules")

    async def _monitoring_loop(self):
        """Continuous monitoring loop"""
        while True:
            try:
                await self._perform_health_check()
                await self._check_auto_withdrawal_rules()
                await asyncio.sleep(self.config['monitoring_interval'])
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(60)  # Wait before retry

    async def _perform_health_check(self):
        """Perform comprehensive health check"""
        try:
            # Update wallet balance
            balance_wei = self.w3.eth.get_balance(self.wallet_address)
            self.health_status['wallet_balance'] = Decimal(self.w3.from_wei(balance_wei, 'ether'))

            # Count pending and failed withdrawals
            pending_count = sum(1 for tx in self.transactions
                              if tx.status == WithdrawalStatus.PENDING)
            failed_count = sum(1 for tx in self.transactions
                             if tx.status == WithdrawalStatus.FAILED)

            self.health_status.update({
                'pending_withdrawals': pending_count,
                'failed_withdrawals': failed_count,
                'last_check': datetime.now()
            })

            # Check alert thresholds
            await self._check_alerts()

        except Exception as e:
            logger.error(f"Health check failed: {e}")

    async def _check_alerts(self):
        """Check for alert conditions"""
        alerts = []

        if self.health_status['pending_withdrawals'] > self.config['alert_thresholds']['max_pending_withdrawals']:
            alerts.append(f"High pending withdrawals: {self.health_status['pending_withdrawals']}")

        if self.health_status['failed_withdrawals'] > self.config['alert_thresholds']['max_failed_withdrawals']:
            alerts.append(f"High failed withdrawals: {self.health_status['failed_withdrawals']}")

        if self.health_status['wallet_balance'] < self.config['alert_thresholds']['min_wallet_balance']:
            alerts.append(f"Low wallet balance: {self.health_status['wallet_balance']} ETH")

        for alert in alerts:
            logger.warning(f"ALERT: {alert}")
            # In production, send notifications

    async def _check_auto_withdrawal_rules(self):
        """Check and trigger auto-withdrawal rules"""
        current_balance = self.health_status['wallet_balance']

        for rule in self.rules.values():
            if not rule.enabled:
                continue

            # Check threshold
            if current_balance >= rule.threshold_eth:
                # Check frequency limit
                if rule.last_triggered:
                    time_since_last = datetime.now() - rule.last_triggered
                    if time_since_last.total_seconds() < (rule.max_frequency_hours * 3600):
                        continue

                # Trigger auto-withdrawal
                try:
                    await self._execute_auto_withdrawal(rule)
                    rule.last_triggered = datetime.now()
                    rule.trigger_count += 1
                    logger.info(f"Auto-withdrawal triggered: {rule.name}")
                except Exception as e:
                    logger.error(f"Auto-withdrawal failed for rule {rule.name}: {e}")

    async def _execute_auto_withdrawal(self, rule: WithdrawalRule):
        """Execute automatic withdrawal based on rule"""
        # Calculate withdrawal amount (percentage of threshold)
        withdrawal_amount = rule.threshold_eth * Decimal('0.8')  # 80% of threshold

        # Select withdrawal address (highest priority enabled)
        target_address = None
        for addr in sorted(self.addresses.values(), key=lambda x: x.priority):
            if addr.enabled:
                target_address = addr
                break

        if not target_address:
            raise ValueError("No enabled withdrawal addresses available")

        # Execute withdrawal
        tx = await self.execute_withdrawal(
            amount_eth=withdrawal_amount,
            to_address=target_address.address,
            mode=WithdrawalMode.AUTO,
            gas_strategy=rule.gas_strategy,
            rule_id=rule.id
        )

        # Update address stats
        target_address.total_withdrawn += withdrawal_amount
        target_address.last_used = datetime.now()

        return tx

    async def execute_withdrawal(
        self,
        amount_eth: Decimal,
        to_address: str,
        mode: WithdrawalMode = WithdrawalMode.MANUAL,
        gas_strategy: GasStrategy = GasStrategy.STANDARD,
        rule_id: Optional[str] = None,
        emergency: bool = False
    ) -> WithdrawalTransaction:
        """
        Execute a withdrawal transaction with comprehensive error handling
        """
        tx_id = secrets.token_hex(16)
        initiated_at = datetime.now()

        # Validate inputs
        self._validate_withdrawal_request(amount_eth, to_address, emergency)

        # Create transaction record
        transaction = WithdrawalTransaction(
            id=tx_id,
            mode=mode,
            amount_eth=amount_eth,
            gas_price_gwei=await self._get_gas_price(gas_strategy),
            gas_used=None,
            fee_eth=None,
            status=WithdrawalStatus.PENDING,
            tx_hash=None,
            from_address=self.wallet_address,
            to_address=to_address,
            initiated_at=initiated_at,
            confirmed_at=None,
            rule_id=rule_id
        )

        self.transactions.append(transaction)
        self.health_status['pending_withdrawals'] += 1

        try:
            # Execute with retry logic
            for attempt in range(self.config['max_retry_attempts'] + 1):
                try:
                    tx_hash = await self._send_withdrawal_transaction(
                        amount_eth, to_address, gas_strategy
                    )

                    transaction.tx_hash = tx_hash
                    transaction.status = WithdrawalStatus.CONFIRMED
                    transaction.confirmed_at = datetime.now()

                    # Wait for confirmation and get gas used
                    await self._wait_for_confirmation(transaction)

                    logger.info(f"Withdrawal successful: {tx_hash}")
                    break

                except Exception as e:
                    transaction.retry_count = attempt + 1
                    error_msg = f"Attempt {attempt + 1} failed: {str(e)}"

                    if attempt == self.config['max_retry_attempts']:
                        transaction.status = WithdrawalStatus.FAILED
                        transaction.error_message = error_msg
                        self.health_status['failed_withdrawals'] += 1
                        logger.error(f"Withdrawal failed after {attempt + 1} attempts: {error_msg}")
                        raise
                    else:
                        logger.warning(error_msg)
                        await asyncio.sleep(self.config['retry_delay_seconds'])

        finally:
            self.health_status['pending_withdrawals'] -= 1
            if transaction.status == WithdrawalStatus.CONFIRMED:
                self.health_status['total_withdrawn'] += amount_eth

        return transaction

    def _validate_withdrawal_request(self, amount_eth: Decimal, to_address: str, emergency: bool):
        """Validate withdrawal request parameters"""
        # Check amount limits
        if not emergency:
            if amount_eth > self.config['security']['max_single_withdrawal']:
                raise ValueError(f"Amount exceeds maximum single withdrawal: {amount_eth} ETH")

            daily_total = sum(tx.amount_eth for tx in self.transactions
                            if tx.status == WithdrawalStatus.CONFIRMED
                            and (datetime.now() - tx.confirmed_at).days < 1)
            if daily_total + amount_eth > self.config['security']['max_daily_withdrawal']:
                raise ValueError(f"Daily withdrawal limit exceeded")

        # Check wallet balance
        if self.health_status['wallet_balance'] < amount_eth + self.config['gas_reserve_eth']:
            raise ValueError("Insufficient wallet balance")

        # Validate address
        if not self.w3.is_address(to_address):
            raise ValueError("Invalid withdrawal address")

        # Security check: ensure not sending to self
        if to_address.lower() == self.wallet_address.lower():
            raise ValueError("Cannot withdraw to the same address")

    async def _get_gas_price(self, strategy: GasStrategy) -> Decimal:
        """Get optimized gas price based on strategy"""
        base_gas_price = self.w3.eth.gas_price
        base_gwei = Decimal(self.w3.from_wei(base_gas_price, 'gwei'))

        multipliers = {
            GasStrategy.SLOW: Decimal('0.8'),
            GasStrategy.STANDARD: Decimal('1.0'),
            GasStrategy.FAST: Decimal('1.5'),
            GasStrategy.OPTIMIZED: Decimal('1.2')  # Balanced approach
        }

        return (base_gwei * multipliers[strategy]).quantize(Decimal('1.'), rounding=ROUND_DOWN)

    async def _send_withdrawal_transaction(
        self,
        amount_eth: Decimal,
        to_address: str,
        gas_strategy: GasStrategy
    ) -> str:
        """Send the actual withdrawal transaction"""
        gas_price = await self._get_gas_price(gas_strategy)
        gas_price_wei = self.w3.to_wei(gas_price, 'gwei')
        amount_wei = self.w3.to_wei(amount_eth, 'ether')

        # Estimate gas
        gas_estimate = self.w3.eth.estimate_gas({
            'from': self.wallet_address,
            'to': to_address,
            'value': amount_wei
        })

        # Add buffer for gas estimation
        gas_limit = int(gas_estimate * 1.2)

        # Build transaction
        tx = {
            'from': self.wallet_address,
            'to': to_address,
            'value': amount_wei,
            'gas': gas_limit,
            'gasPrice': gas_price_wei,
            'nonce': self.w3.eth.get_transaction_count(self.wallet_address),
            'chainId': self.config['chain_id']
        }

        # Sign and send
        signed_tx = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        return self.w3.to_hex(tx_hash)

    async def _wait_for_confirmation(self, transaction: WithdrawalTransaction):
        """Wait for transaction confirmation and update gas used"""
        try:
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(
                transaction.tx_hash,
                timeout=300  # 5 minutes
            )

            transaction.gas_used = receipt['gasUsed']
            transaction.fee_eth = Decimal(self.w3.from_wei(
                transaction.gas_used * self.w3.eth.get_transaction(transaction.tx_hash)['gasPrice'],
                'ether'
            ))

        except Exception as e:
            logger.error(f"Error waiting for confirmation: {e}")
            # Transaction might still be confirmed, but we can't get gas details

    # Public API methods for dashboard integration

    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        return {
            'online': self.health_status['rpc_connected'],
            'wallet_balance': float(self.health_status['wallet_balance']),
            'pending_withdrawals': self.health_status['pending_withdrawals'],
            'failed_withdrawals': self.health_status['failed_withdrawals'],
            'total_withdrawn': float(self.health_status['total_withdrawn']),
            'last_check': self.health_status['last_check'].isoformat(),
            'withdrawal_service': 'operational' if self.health_status['rpc_connected'] else 'degraded'
        }

    def get_withdrawal_stats(self) -> Dict[str, Any]:
        """Get withdrawal statistics"""
        confirmed_txs = [tx for tx in self.transactions if tx.status == WithdrawalStatus.CONFIRMED]

        if not confirmed_txs:
            return {
                'total_withdrawn_eth': 0.0,
                'success_rate': 0.0,
                'withdrawal_count': 0,
                'average_gas_fee': 0.0,
                'daily_withdrawal_total': 0.0,
                'daily_withdrawal_limit': self.config['security']['max_daily_withdrawal']
            }

        total_withdrawn = sum(tx.amount_eth for tx in confirmed_txs)
        total_gas_fees = sum(tx.fee_eth for tx in confirmed_txs if tx.fee_eth)
        avg_gas_fee = total_gas_fees / len([tx for tx in confirmed_txs if tx.fee_eth]) if total_gas_fees else 0

        # Daily total (last 24 hours)
        yesterday = datetime.now() - timedelta(days=1)
        daily_total = sum(tx.amount_eth for tx in confirmed_txs
                         if tx.confirmed_at and tx.confirmed_at > yesterday)

        return {
            'total_withdrawn_eth': float(total_withdrawn),
            'success_rate': len(confirmed_txs) / len(self.transactions) * 100 if self.transactions else 0,
            'withdrawal_count': len(confirmed_txs),
            'average_gas_fee': float(avg_gas_fee),
            'daily_withdrawal_total': float(daily_total),
            'daily_withdrawal_limit': self.config['security']['max_daily_withdrawal']
        }

    def get_withdrawal_history(self, limit: int = 100) -> Dict[str, Any]:
        """Get withdrawal transaction history"""
        # Sort by initiation time, most recent first
        sorted_txs = sorted(self.transactions, key=lambda x: x.initiated_at, reverse=True)
        recent_txs = sorted_txs[:limit]

        history = []
        for tx in recent_txs:
            history.append({
                'id': tx.id,
                'amount_eth': float(tx.amount_eth),
                'gas_price_gwei': float(tx.gas_price_gwei),
                'fee_eth': float(tx.fee_eth) if tx.fee_eth else None,
                'status': tx.status.value,
                'tx_hash': tx.tx_hash,
                'to_address': tx.to_address,
                'initiated_at': tx.initiated_at.isoformat(),
                'confirmed_at': tx.confirmed_at.isoformat() if tx.confirmed_at else None,
                'mode': tx.mode.value,
                'error_message': tx.error_message
            })

        return {
            'history': history,
            'total_count': len(self.transactions),
            'limit': limit
        }

    def get_pending_withdrawals(self) -> Dict[str, Any]:
        """Get pending withdrawal transactions"""
        pending = [tx for tx in self.transactions if tx.status == WithdrawalStatus.PENDING]

        return {
            'count': len(pending),
            'withdrawals': [{
                'id': tx.id,
                'amount_eth': float(tx.amount_eth),
                'to_address': tx.to_address,
                'initiated_at': tx.initiated_at.isoformat(),
                'mode': tx.mode.value
            } for tx in pending]
        }

    def get_addresses(self) -> Dict[str, Any]:
        """Get withdrawal addresses"""
        addresses_list = []
        for addr in self.addresses.values():
            addresses_list.append({
                'address': addr.address,
                'label': addr.label,
                'percentage': addr.percentage,
                'priority': addr.priority,
                'enabled': addr.enabled,
                'last_used': addr.last_used.isoformat() if addr.last_used else None,
                'total_withdrawn': float(addr.total_withdrawn)
            })

        return {'addresses': addresses_list}

    def get_rules(self) -> Dict[str, Any]:
        """Get withdrawal rules"""
        rules_list = []
        for rule in self.rules.values():
            rules_list.append({
                'id': rule.id,
                'name': rule.name,
                'threshold_eth': float(rule.threshold_eth),
                'gas_strategy': rule.gas_strategy.value,
                'max_frequency_hours': rule.max_frequency_hours,
                'enabled': rule.enabled,
                'last_triggered': rule.last_triggered.isoformat() if rule.last_triggered else None,
                'trigger_count': rule.trigger_count
            })

        return {'rules': rules_list}

    def get_network_status(self) -> Dict[str, Any]:
        """Get network and gas status"""
        try:
            gas_price = self.w3.eth.gas_price
            block_number = self.w3.eth.block_number

            return {
                'network': 'ethereum_mainnet',
                'block_number': block_number,
                'gas_price_gwei': float(self.w3.from_wei(gas_price, 'gwei')),
                'is_connected': self.w3.is_connected(),
                'chain_id': self.config['chain_id']
            }
        except Exception as e:
            return {
                'network': 'ethereum_mainnet',
                'error': str(e),
                'is_connected': False
            }

    # Management methods

    def add_withdrawal_address(self, address: str, label: str, percentage: float, priority: int) -> bool:
        """Add a new withdrawal address"""
        try:
            if not self.w3.is_address(address):
                raise ValueError("Invalid address format")

            if address in self.addresses:
                raise ValueError("Address already exists")

            withdrawal_addr = WithdrawalAddress(
                address=address,
                label=label,
                percentage=percentage,
                priority=priority
            )

            self.addresses[address] = withdrawal_addr

            # Save to config
            self._save_config()

            logger.info(f"Added withdrawal address: {label} ({address[:10]}...)")
            return True

        except Exception as e:
            logger.error(f"Failed to add withdrawal address: {e}")
            return False

    def add_withdrawal_rule(self, name: str, threshold_eth: Decimal,
                          gas_strategy: GasStrategy, max_frequency_hours: int) -> Optional[str]:
        """Add a new withdrawal rule"""
        try:
            rule_id = secrets.token_hex(8)

            rule = WithdrawalRule(
                id=rule_id,
                name=name,
                threshold_eth=threshold_eth,
                gas_strategy=gas_strategy,
                max_frequency_hours=max_frequency_hours
            )

            self.rules[rule_id] = rule

            # Save to config
            self._save_config()

            logger.info(f"Added withdrawal rule: {name}")
            return rule_id

        except Exception as e:
            logger.error(f"Failed to add withdrawal rule: {e}")
            return None

    def _save_config(self):
        """Save current configuration to file"""
        try:
            config_to_save = self.config.copy()

            # Add current addresses and rules
            config_to_save['addresses'] = [asdict(addr) for addr in self.addresses.values()]
            config_to_save['rules'] = [asdict(rule) for rule in self.rules.values()]

            with open(self.config_path, 'w') as f:
                json.dump(config_to_save, f, indent=2, default=str)

        except Exception as e:
            logger.error(f"Failed to save config: {e}")

    # Emergency methods

    async def execute_emergency_withdrawal(self, percentage: float) -> WithdrawalTransaction:
        """Execute emergency withdrawal of specified percentage of balance"""
        if not 0 < percentage <= 100:
            raise ValueError("Percentage must be between 1 and 100")

        available_balance = self.health_status['wallet_balance'] - self.config['gas_reserve_eth']
        if available_balance <= 0:
            raise ValueError("Insufficient balance for emergency withdrawal")

        withdrawal_amount = available_balance * Decimal(percentage / 100)

        # Use highest priority address
        target_address = None
        for addr in sorted(self.addresses.values(), key=lambda x: x.priority):
            if addr.enabled:
                target_address = addr
                break

        if not target_address:
            raise ValueError("No enabled withdrawal addresses available")

        return await self.execute_withdrawal(
            amount_eth=withdrawal_amount,
            to_address=target_address.address,
            mode=WithdrawalMode.EMERGENCY,
            gas_strategy=GasStrategy.FAST,
            emergency=True
        )


# Global system instance
_system_instance: Optional[ProfitWithdrawalSystem] = None


def get_withdrawal_system() -> ProfitWithdrawalSystem:
    """Get the global withdrawal system instance"""
    global _system_instance
    if _system_instance is None:
        _system_instance = ProfitWithdrawalSystem()
    return _system_instance


# Convenience functions for external use
async def execute_manual_withdrawal(amount_eth: float, gas_strategy: str = "standard") -> Dict[str, Any]:
    """Execute manual withdrawal"""
    system = get_withdrawal_system()

    # Get primary address
    primary_addr = None
    for addr in sorted(system.addresses.values(), key=lambda x: x.priority):
        if addr.enabled:
            primary_addr = addr
            break

    if not primary_addr:
        raise ValueError("No withdrawal addresses configured")

    tx = await system.execute_withdrawal(
        amount_eth=Decimal(str(amount_eth)),
        to_address=primary_addr.address,
        mode=WithdrawalMode.MANUAL,
        gas_strategy=GasStrategy(gas_strategy)
    )

    return {
        'success': tx.status == WithdrawalStatus.CONFIRMED,
        'tx_hash': tx.tx_hash,
        'amount_eth': float(tx.amount_eth),
        'fee_eth': float(tx.fee_eth) if tx.fee_eth else None
    }


async def get_system_stats() -> Dict[str, Any]:
    """Get system statistics"""
    system = get_withdrawal_system()
    return system.get_withdrawal_stats()


if __name__ == "__main__":
    # Example usage
    async def main():
        system = get_withdrawal_system()

        # Add a withdrawal address
        system.add_withdrawal_address(
            address="0xA51E466e659Cf9DdD5a5CA9ECDd8392302102490",
            label="Primary Wallet",
            percentage=100.0,
            priority=1
        )

        # Add an auto-withdrawal rule
        system.add_withdrawal_rule(
            name="High Balance Auto-Withdrawal",
            threshold_eth=Decimal('5.0'),
            gas_strategy=GasStrategy.OPTIMIZED,
            max_frequency_hours=24
        )

        print("Profit Withdrawal System initialized and configured")

        # Keep running for monitoring
        while True:
            await asyncio.sleep(60)
            stats = system.get_withdrawal_stats()
            print(f"System Status: {stats}")

    asyncio.run(main())