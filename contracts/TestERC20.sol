// SPDX-License-Identifier: MIT

import "./Dependencies.sol";

pragma solidity ^0.8.23;

contract TestERC20 is ERC20 {
  constructor() ERC20('ERC20 Test', 'TEST') {
    _mint(msg.sender, 1000);
  }


  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}
