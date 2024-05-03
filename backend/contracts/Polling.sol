//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

contract Polling {
    error Unauthorized();
    error Restricted();

    struct Owner {
        // address of the owner
        address ownerAddress;
        // name of the owner
        string name;
    }

    struct Director {
        // time in seconds from the epoch when the directos was created
        uint256 createdAtInSeconds;
        // address of the director
        address directorAddress;
        // name of the director
        string name;
    }

    struct StakeHolder {
        // time in seconds from the epoch when the stakeholder first staked some amount
        uint256 stakedAtTimeInSeconds;
        // the index in which the stakeholder address in stored at
        uint256 addressIndex;
        // address of the stakeholder
        address stakeHolderAddress;
        // name of the stakeholder
        string name;
        // amount staked by the shareholder
        uint256 amountStaked;
    }

    struct Task {
        // time in seconds from the epoch when the task was created
        uint256 createdAtTimeInSeconds;
        // unique identifier for the task
        uint256 id;
        // the address of the user who added the task
        address createdBy;
        // title of the task
        string title;
        // details about the task
        string description;
        // addresses of the stakeholders who have approved the task
        address[] approvedBy;
        // to keep track of the task approved
        bool isApproved;
    }

    // name of the organisation
    string public organisationName;
    // address of the owner who deployed the smart contract
    Owner public owner;
    // directors can add tasks which will be approved by the stakeholders.
    Director[] private directors;
    // stakeholders who has staked some assets into the organization.
    mapping(address => StakeHolder) private stakeHolders;
    // keeps track of the addresses of stakeholders
    address[] private stakeHolderAddresses;
    // stores all the created tasks
    Task[] private tasks;
    // a task will only be approved if it is approved by atleast taskApprovalPercentage of the total stakeholders
    uint256 public taskApprovalPercentage;
    // counter to keep the task id unique
    uint256 private taskIdCounter;
    // minimum amount to be staked (wei) to become a stakeholder
    // 1000000000000000000
    uint256 public minimumStakingAmount;
    // period after which the stakeholder can withdraw their staked amount
    uint256 public vestingPeriodInDays;
    // total amount stored in the smart contract
    uint256 private balance;
    // flag for re-entrancy guard
    bool private locked;

    constructor(
        string memory _organisationName,
        string memory _ownerName,
        uint256 _taskApprovalPercentage,
        uint256 _minimumStakingAmount,
        uint256 _vestingPeriodInDays
    ) {
        require(
            !isEmptyString(_organisationName),
            "Organisation name cannot be empty!"
        );

        require(
            _taskApprovalPercentage > 0 && _taskApprovalPercentage <= 100,
            "The approval percentage of tasks should be a valid percentage value."
        );

        require(
            _minimumStakingAmount > 0,
            "Minimum staking amount should be more than zero!"
        );

        require(
            _vestingPeriodInDays >= 0,
            "Vesting period cannot be less than 0!"
        );

        organisationName = _organisationName;
        owner = Owner({ownerAddress: msg.sender, name: _ownerName});
        stakeHolderAddresses = new address[](0);
        taskApprovalPercentage = _taskApprovalPercentage;
        taskIdCounter = 0;
        minimumStakingAmount = _minimumStakingAmount;
        vestingPeriodInDays = _vestingPeriodInDays;
        balance = 0;
        locked = false;
    }

    modifier onlyOwner() {
        if (!isOwner(msg.sender)) revert Unauthorized();
        _;
    }

    modifier onlyDirector() {
        if (!isDirector(msg.sender)) revert Unauthorized();
        _;
    }

    modifier onlyStakeHolder() {
        if (!isStakeHolder(msg.sender)) revert Unauthorized();
        _;
    }

    modifier onlyOwnerOrDirector() {
        if (isOwner(msg.sender) || isDirector(msg.sender)) _;
        else revert Unauthorized();
    }

    modifier reEntrancyGuard() {
        if (locked) revert Restricted();

        locked = true;
        _;
        locked = false;
    }

    event DirectorAdded(address _address);
    event StakeHolderAdded(address _address, uint256 _amountStaked);
    event StakeHolderRemoved(address _address);
    event AmountWithdrawn(address _address, uint256 _amountWithdrawn);
    event TaskAdded(uint256 _id, string _title, string _description);
    event TaskApproved(uint256 _id, string _title, address _approvedBy);

    function isOwner(address _address) private view returns (bool) {
        if (_address == owner.ownerAddress) return true;
        return false;
    }

    function isDirector(address _address) private view returns (bool) {
        for (uint256 i = 0; i < directors.length; i++) {
            if (directors[i].directorAddress == _address) return true;
        }
        return false;
    }

    function isStakeHolder(address _address) private view returns (bool) {
        return stakeHolders[_address].amountStaked > 0;
    }

    function isTaskAddedWithSameTitle(
        string memory _title
    ) private view returns (bool) {
        for (uint256 i = 0; i < tasks.length; i++) {
            if (isEqualStrings(_title, tasks[i].title)) return true;
        }
        return false;
    }

    function isTaskAlreadyApprovedByAStakeHolder(
        address _stakeHolderAddress,
        address[] memory _approvedBy
    ) private pure returns (bool) {
        for (uint256 i = 0; i < _approvedBy.length; i++) {
            if (_stakeHolderAddress == _approvedBy[i]) return true;
        }
        return false;
    }

    function isEqualStrings(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        return
            bytes(a).length == bytes(b).length &&
            keccak256(bytes(a)) == keccak256(bytes(b));
    }

    function isEmptyString(string memory _string) internal pure returns (bool) {
        return bytes(_string).length == 0;
    }

    // deposit the staked amount into the smart contract and add the stakeholder
    function stakeAmount(string memory _name) public payable reEntrancyGuard {
        if (isOwner(msg.sender) || isDirector(msg.sender))
            revert Unauthorized();

        require(!isEmptyString(_name), "Stakeholder name cannot be empty!");
        require(!isStakeHolder(msg.sender), "You are already a Stakeholder!");
        require(
            msg.value >= minimumStakingAmount,
            "Received amount does not meet the minimum staking amount!"
        );

        stakeHolders[msg.sender] = StakeHolder({
            stakedAtTimeInSeconds: block.timestamp,
            addressIndex: stakeHolderAddresses.length,
            stakeHolderAddress: msg.sender,
            name: _name,
            amountStaked: msg.value
        });
        stakeHolderAddresses.push(msg.sender);

        emit StakeHolderAdded(msg.sender, msg.value);
    }

    // withdraw the amount deposited by the stakeholder
    // only allow withdrawal if the vesting period is fulfilled
    function withdrawAmount(
        uint256 _amount
    ) public payable onlyStakeHolder reEntrancyGuard {
        StakeHolder memory stakeHolder = stakeHolders[msg.sender];

        require(_amount > 0, "Amount should be more than zero!");
        require(_amount <= stakeHolder.amountStaked, "Insufficient balance!");

        if (stakeHolder.amountStaked - _amount > 0) {
            require(
                (stakeHolder.amountStaked - _amount >= minimumStakingAmount),
                "Balance left should be more than minimum staking amount!"
            );
        }

        uint256 depositTimeInSeconds = stakeHolders[msg.sender]
            .stakedAtTimeInSeconds;
        uint256 currentTimeInSeconds = block.timestamp;
        uint256 elapsedTimeInSeconds = currentTimeInSeconds -
            depositTimeInSeconds;
        uint256 elapsedDays = elapsedTimeInSeconds / 86400;

        require(
            elapsedDays >= vestingPeriodInDays,
            "Staked amount not vested yet!"
        );

        (bool success, ) = msg.sender.call{value: _amount}("");

        require(success, "Failed to transfer Ether!");

        stakeHolders[msg.sender].amountStaked -= _amount;

        emit AmountWithdrawn(msg.sender, _amount);

        if (stakeHolders[msg.sender].amountStaked == 0) {
            delete stakeHolderAddresses[stakeHolders[msg.sender].addressIndex];
            emit StakeHolderRemoved(msg.sender);
        }
    }

    function addDirector(
        address _address,
        string memory _name
    ) public onlyOwner {
        require(_address != owner.ownerAddress, "Address is already a Owner!");
        require(!isDirector(_address), "Address is already a Director!");
        require(!isStakeHolder(_address), "Address is already a Stakeholder!");
        require(!isEmptyString(_name), "Director name cannot be empty!");

        directors.push(
            Director({
                createdAtInSeconds: block.timestamp,
                directorAddress: _address,
                name: _name
            })
        );

        emit DirectorAdded(_address);
    }

    function addTask(
        string memory _title,
        string memory _description
    ) public onlyOwnerOrDirector {
        require(!isEmptyString(_title), "Title cannot be empty!");
        require(!isEmptyString(_description), "Description cannot be empty!");
        require(
            !isTaskAddedWithSameTitle(_title),
            "A task with the same title is already added!"
        );

        uint256 taskId = ++taskIdCounter;

        Task memory task = Task({
            createdAtTimeInSeconds: block.timestamp,
            id: taskId,
            createdBy: msg.sender,
            title: _title,
            description: _description,
            approvedBy: new address[](0),
            isApproved: stakeHolderAddresses.length == 0
        });

        tasks.push(task);

        emit TaskAdded(taskId, _title, _description);
    }

    function approveTask(uint256 _taskId) public onlyStakeHolder {
        for (uint256 i = 0; i < tasks.length; i++) {
            if (tasks[i].id == _taskId) {
                Task storage task = tasks[i];
                uint256 approvalsRequired = ((stakeHolderAddresses.length *
                    taskApprovalPercentage) / 100) + 1;

                require(
                    !isTaskAlreadyApprovedByAStakeHolder(
                        msg.sender,
                        task.approvedBy
                    ),
                    "Task already approved by you!"
                );
                require(!task.isApproved, "Task already approved!");

                task.approvedBy.push(msg.sender);

                if (task.approvedBy.length >= approvalsRequired)
                    task.isApproved = true;

                emit TaskApproved(task.id, task.title, msg.sender);

                break;
            }
        }
    }

    function getTasks() public view returns (Task[] memory) {
        return tasks;
    }

    function getDirectors() public view returns (Director[] memory) {
        return directors;
    }

    function getStakeholders() public view returns (StakeHolder[] memory) {
        StakeHolder[] memory allStakeHolders = new StakeHolder[](
            stakeHolderAddresses.length
        );

        for (uint256 i = 0; i < stakeHolderAddresses.length; i++) {
            allStakeHolders[i] = stakeHolders[stakeHolderAddresses[i]];
        }

        return allStakeHolders;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getRole(address _address) public view returns (string memory) {
        if (isOwner(_address)) return "Owner";
        else if (isDirector(_address)) return "Director";
        else if (isStakeHolder(_address)) return "Stakeholder";
        else return "User";
    }

    function getUserName(address _address) public view returns (string memory) {
        string memory role = getRole(_address);

        if (isEqualStrings(role, "User")) return "External";
        else if (isEqualStrings(role, "Owner")) return owner.name;
        else if (isEqualStrings(role, "Director")) {
            for (uint256 i = 0; i < directors.length; i++)
                if (directors[i].directorAddress == _address)
                    return directors[i].name;
        } else if (isEqualStrings(role, "Stakeholder")) {
            for (uint256 i = 0; i < stakeHolderAddresses.length; i++)
                if (stakeHolderAddresses[i] == _address)
                    return stakeHolders[stakeHolderAddresses[i]].name;
        }
        return "";
    }
}
