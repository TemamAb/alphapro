// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFlashLoan {
    function flashLoan(address asset, uint256 amount, bytes calldata params) external;
}

contract FlashLoanExecutor {
    address public owner;
    IFlashLoan public flashLoanProvider;

    constructor(address _flashLoanProvider) {
        owner = msg.sender;
        flashLoanProvider = IFlashLoan(_flashLoanProvider);
    }

    function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external {
        require(msg.sender == owner, "Only owner can execute");
        flashLoanProvider.flashLoan(asset, amount, params);
    }

    function executeArbitrage(bytes calldata data) external {
        // Mock arbitrage logic
        // In real implementation, decode data and perform swaps
    }
}
