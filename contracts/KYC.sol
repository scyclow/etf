// SPDX-License-Identifier: MIT

import "./Dependencies.sol";


pragma solidity ^0.8.23;

interface IETF {
  function isMarketOpen() external view returns (bool);
  function create(uint256, address) external payable;
  function redeem(uint256, address, uint256) external;
  function transferFrom(address, address, uint256) external returns (bool);
}

interface IAuthorizedParticipants {
  function safeTransferFrom(address, address, uint256) external;
}

contract KYC is ERC721, ERC721Burnable, Ownable {
  uint256 public totalSupply;

  IETF public etf;

  struct KYCInfo {
    string firstName;
    string lastName;
    address addr;
  }
  mapping(uint256 => KYCInfo) public kycInfo;
  mapping(address => uint256) public addrToTokenId;
  bool isLocked;

  constructor(address _etf) ERC721('KYC', 'KYC') {
    etf = IETF(_etf);
  }

  function exists(uint256 tokenId) external view returns (bool) {
    return _exists(tokenId);
  }

  function register(string memory firstName, string memory lastName) external {
    require(etf.isMarketOpen(), 'KYC mint unavailable');
    require(bytes(firstName).length != 0 && bytes(lastName).length != 0, 'Invalid KYC info');

    uint256 id = getId(firstName, lastName);

    require(
      bytes(kycInfo[id].firstName).length == 0 && addrToTokenId[msg.sender] == 0,
      'KYC already registered'
    );

    kycInfo[id].firstName = firstName;
    kycInfo[id].lastName = lastName;
    kycInfo[id].addr = msg.sender;
    addrToTokenId[msg.sender] = id;

    _safeMint(msg.sender, id);
    totalSupply++;
  }

  function getId(string memory firstName, string memory lastName) public pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(firstName, lastName)));
  }

  function getAddr(uint256 tokenId) external view returns (address) {
    return kycInfo[tokenId].addr;
  }

  function getAddr(string memory firstName, string memory lastName) external view returns (address) {
    return kycInfo[getId(firstName, lastName)].addr;
  }


  function revoke(uint256 tokenId) external onlyOwner {
    _burn(tokenId);
  }

  string public externalUrl = "https://steviep.xyz/etf";
  string public description = "Always know your customer";


  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

    bytes memory encodedSVG = abi.encodePacked(
      'data:image/svg+xml;base64,',
      Base64.encode(rawSVG(tokenId))
    );


    string memory addr = Strings.toHexString(uint256(uint160(kycInfo[tokenId].addr)), 20);

    bytes memory attrs = abi.encodePacked(
      '[',
      '{"trait_type": "First Name", "value": "', kycInfo[tokenId].firstName, '"},',
      '{"trait_type": "Last Name", "value": "', kycInfo[tokenId].lastName, '"},',
      '{"trait_type": "Address", "value": "', addr, '"}',
      ']'
    );


    bytes memory json = abi.encodePacked(
      'data:application/json;utf8,',
      '{"name": "KYC ', addr, '",',
      '"description": "', description, '",',
      '"image": "', encodedSVG, '",',
      '"attributes": ', attrs,',',
      '"external_url": "', externalUrl, '"',
      '}'
    );

    return string(json);
  }

  function rawSVG(uint256 tokenId) public view returns (bytes memory) {
    string memory addr = Strings.toHexString(uint256(uint160(kycInfo[tokenId].addr)), 20);

    return abi.encodePacked(
      '<svg viewBox="0 0 380 250" xmlns="http://www.w3.org/2000/svg">'
        '<style>.k{dominant-baseline:middle;text-anchor:middle;font-size:40px;font-family:serif}.n{fill:#e74d61;font-family:monospace;font-size:30px}.a{fill:#e74d61;font-family:monospace;font-size:11px}</style>'
        '<rect x="0" y="0" width="380" height="250" fill="#f1f1d1"></rect>'
        '<rect x="10" y="10" width="360" height="230" stroke="#002150" fill="none" rx="15"></rect>'
        '<rect x="15" y="15" width="350" height="220" stroke="#002150" fill="none" rx="15"></rect>'
        '<rect x="15" y="15" width="350" height="50" fill="#4368a2" rx="15" stroke="#002150"></rect>'
        '<rect x="15.5" y="50" width="349" height="15" fill="#4368a2" ></rect>'
        '<line x1="15" y1="65" x2="365" y2="65" stroke="#002150"></line>'
        '<text x="192" y="47" class="k" fill="#082262">KYC</text>'
        '<text x="191" y="46" class="k" fill="#082262">KYC</text>'
        '<text x="190" y="45" class="k" fill="#fbf7ed" stroke="#002150">KYC</text>'
        '<text class="n k" x="50%" y="119">', kycInfo[tokenId].firstName, '</text>'
        '<text class="n k" x="50%" y="156">', kycInfo[tokenId].lastName, '</text>'
        '<text class="a k" x="50%" y="210">', addr, '</text>'
      '</svg>'
    );
  }
}


