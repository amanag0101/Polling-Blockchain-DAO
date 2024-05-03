const { ethers } = require("hardhat");
const { expect } = require("chai");

const SECONDS_IN_A_DAY = 86400;

describe("Polling", () => {
  const organisationName = "Green Group LLC";
  const ownerName = "John Doe";
  const taskApprovalPercentage = 50;
  const minimumStakingAmount = ethers.parseEther("10");
  const vestingPeriodInDays = 1;

  async function deployFixture() {
    const [
      owner,
      director1,
      director2,
      stakeHolder1,
      stakeHolder2,
      otherAccount,
    ] = await ethers.getSigners();
    const Polling = await ethers.getContractFactory("Polling");
    const polling = await Polling.deploy(
      organisationName,
      ownerName,
      taskApprovalPercentage,
      minimumStakingAmount,
      vestingPeriodInDays
    );

    return {
      polling,
      owner,
      director1,
      director2,
      stakeHolder1,
      stakeHolder2,
      otherAccount,
    };
  }

  describe("Deployment", () => {
    it("Should set the rigth organisation name", async () => {
      const { polling } = await deployFixture();

      expect(await polling.organisationName()).to.equal(organisationName);
    });

    it("Should set the right owner", async () => {
      const { polling, owner } = await deployFixture();

      const _owner = await polling.owner();

      expect(_owner[0]).to.equal(owner.address);
      expect(_owner[1]).to.equal(ownerName);
    });

    it("Should set the right directors", async () => {
      const { polling } = await deployFixture();
      const directors = await polling.getDirectors();

      expect(directors.length).to.equal(0);
    });

    it("Should set the right taskApprovalPercentage", async () => {
      const { polling } = await deployFixture();

      expect(await polling.taskApprovalPercentage()).to.equal(
        taskApprovalPercentage
      );
    });

    it("Should set the right minimumStakingAmount", async () => {
      const { polling } = await deployFixture();

      expect(await polling.minimumStakingAmount()).to.equal(
        minimumStakingAmount
      );
    });

    it("Should set the right vestingPeriodInDays", async () => {
      const { polling } = await deployFixture();

      expect(await polling.vestingPeriodInDays()).to.equal(vestingPeriodInDays);
    });

    it("Should have no added tasks", async () => {
      const { polling } = await deployFixture();

      const tasks = await polling.getTasks();

      expect(tasks.length).to.equal(0);
    });

    it("Should have no added stakeholders", async () => {
      const { polling } = await deployFixture();

      const stakeholders = await polling.getStakeholders();

      expect(stakeholders.length).to.equal(0);
    });

    it("Should have zero balance", async () => {
      const { polling } = await deployFixture();

      expect(await polling.getBalance()).to.equal(0);
    });
  });

  describe("Adding a Stakeholder", () => {
    it("Should revert if adding a stakeholder with an empty name", async () => {
      const { polling, stakeHolder1 } = await deployFixture();

      const tx = polling
        .connect(stakeHolder1)
        .stakeAmount("", { value: minimumStakingAmount });

      await expect(tx).to.be.revertedWith("Stakeholder name cannot be empty!");
    });

    it("Should revert if adding a stakeholder using owner account", async () => {
      const { polling, owner } = await deployFixture();

      const tx = polling
        .connect(owner)
        .stakeAmount("Stakeholder 1", { value: minimumStakingAmount });

      await expect(tx).to.be.revertedWithCustomError(polling, "Unauthorized");
    });

    it("Should revert if adding a stakeholder using director account", async () => {
      const { polling, owner, director1 } = await deployFixture();

      await polling.connect(owner).addDirector(director1, "Director1");

      const tx = polling
        .connect(director1)
        .stakeAmount("Stakeholder 1", { value: minimumStakingAmount });

      await expect(tx).to.be.revertedWithCustomError(polling, "Unauthorized");
    });

    it("Should revert if adding a stakeholder with an amount less than minimumStakingAmount", async () => {
      const { polling, stakeHolder1 } = await deployFixture();

      const tx = polling
        .connect(stakeHolder1)
        .stakeAmount("Stakeholder 1", { value: ethers.parseEther("5") });

      await expect(tx).to.be.revertedWith(
        "Received amount does not meet the minimum staking amount!"
      );
    });

    it("Should add a new Stakeholder", async () => {
      const { polling, stakeHolder1 } = await deployFixture();

      const balanceBefore = await polling.getBalance();
      const stakeHoldersBefore = await polling.getStakeholders();

      await polling
        .connect(stakeHolder1)
        .stakeAmount("Stakeholder 1", { value: minimumStakingAmount });

      const balanceAfter = await polling.getBalance();
      const stakeHoldersAfter = await polling.getStakeholders();

      expect(stakeHoldersAfter[0][3]).to.equal("Stakeholder 1");
      expect(balanceBefore + minimumStakingAmount).to.equal(balanceAfter);
      expect(stakeHoldersBefore.length + 1).to.equal(stakeHoldersAfter.length);
    });
  });

  describe("Withdrawing staked amount", () => {
    it("Should revert if withdrawing from a non-stakeholder account", async () => {
      const { polling, otherAccount } = await deployFixture();

      await expect(
        polling.connect(otherAccount).withdrawAmount(minimumStakingAmount)
      ).to.be.revertedWithCustomError(polling, "Unauthorized");
    });

    it("Should revert if withdrawing before vesting period", async () => {
      const { polling, stakeHolder1 } = await deployFixture();

      await polling
        .connect(stakeHolder1)
        .stakeAmount("Stakeholder 1", { value: ethers.parseEther("10") });

      const tx = polling
        .connect(stakeHolder1)
        .withdrawAmount(minimumStakingAmount);

      await expect(tx).to.be.revertedWith("Staked amount not vested yet!");
    });

    it("Should revert if withdrawing more than staked amount", async () => {
      const { polling, stakeHolder1 } = await deployFixture();

      await polling
        .connect(stakeHolder1)
        .stakeAmount("Stakeholder 1", { value: ethers.parseEther("10") });

      await ethers.provider.send("evm_increaseTime", [
        SECONDS_IN_A_DAY * vestingPeriodInDays,
      ]);

      const tx = polling
        .connect(stakeHolder1)
        .withdrawAmount(ethers.parseEther("11"));

      await expect(tx).to.be.revertedWith("Insufficient balance!");
    });

    it("Should revert if balance left is less than minimumStakingAmount", async () => {
      const { polling, stakeHolder1 } = await deployFixture();

      await polling
        .connect(stakeHolder1)
        .stakeAmount("Stakeholder 1", { value: ethers.parseEther("20") });

      await ethers.provider.send("evm_increaseTime", [
        SECONDS_IN_A_DAY * vestingPeriodInDays,
      ]);

      const tx = polling
        .connect(stakeHolder1)
        .withdrawAmount(ethers.parseEther("12"));

      await expect(tx).to.be.revertedWith(
        "Balance left should be more than minimum staking amount!"
      );
    });

    it("Should allow withdrawing partial amount after the vesting period", async () => {
      const { polling, stakeHolder1 } = await deployFixture();

      await polling
        .connect(stakeHolder1)
        .stakeAmount("Stakeholder 1", { value: ethers.parseEther("30") });

      await ethers.provider.send("evm_increaseTime", [
        SECONDS_IN_A_DAY * vestingPeriodInDays,
      ]);

      await polling
        .connect(stakeHolder1)
        .withdrawAmount(ethers.parseEther("15"));

      expect(await polling.getBalance()).to.equal(ethers.parseEther("15"));

      const stakeHolders = await polling.getStakeholders();

      expect(stakeHolders[0][4] == ethers.parseEther("15")).to.equal(true);
    });

    it("Should allow withdrawing the complete amount after vesting period and remove the stakeholder", async () => {
      const { polling, stakeHolder1 } = await deployFixture();

      await polling
        .connect(stakeHolder1)
        .stakeAmount("Stakeholder 1", { value: ethers.parseEther("10") });

      await ethers.provider.send("evm_increaseTime", [
        SECONDS_IN_A_DAY * vestingPeriodInDays,
      ]);

      await polling
        .connect(stakeHolder1)
        .withdrawAmount(ethers.parseEther("10"));

      expect(await polling.getBalance()).to.equal(0);

      const stakeHolders = await polling.getStakeholders();

      expect(stakeHolders[0][0] == 0).to.equal(true);
      expect(stakeHolders[0][1] == 0).to.equal(true);
      expect(stakeHolders[0][2] == 0).to.equal(true);
    });
  });

  describe("Adding a Director", () => {
    it("Should revert if adding a director from a non-owner account", async () => {
      const { polling, otherAccount } = await deployFixture();

      await expect(
        polling.connect(otherAccount).addDirector(otherAccount, "Director1")
      ).to.be.revertedWithCustomError(polling, "Unauthorized");
    });

    it("Should revert if adding a director with an empty name", async () => {
      const { polling, owner, director1 } = await deployFixture();

      await expect(
        polling.connect(owner).addDirector(director1, "")
      ).to.be.revertedWith("Director name cannot be empty!");
    });

    it("Should revert if adding an existing director", async () => {
      const { polling, owner, director1 } = await deployFixture();

      await polling.connect(owner).addDirector(director1, "Director1");

      await expect(
        polling.connect(owner).addDirector(director1, "Director2")
      ).to.be.revertedWith("Address is already a Director!");
    });

    it("Should allow the owner to add a director", async () => {
      const { polling, owner, director1 } = await deployFixture();

      await polling.connect(owner).addDirector(director1, "Director1");

      const directors = await polling.getDirectors();

      expect(directors.map((director) => director.directorAddress)).to.include(
        director1.address
      );
      expect(directors.length).to.equal(1);
    });
  });

  describe("Adding a Task", () => {
    it("Should revert if adding a task from a non-director account", async () => {
      const { polling, stakeHolder1 } = await deployFixture();

      const title = "Task 1";
      const description = "Task 1 description.";

      await expect(
        polling.connect(stakeHolder1).addTask(title, description)
      ).to.be.revertedWithCustomError(polling, "Unauthorized");
    });

    it("Should revert if adding a task with an empty title", async () => {
      const { polling, owner, director1 } = await deployFixture();

      await polling.connect(owner).addDirector(director1, "Director1");

      const title = "";
      const description = "Task 1 description.";

      await expect(
        polling.connect(director1).addTask(title, description)
      ).to.be.revertedWith("Title cannot be empty!");
    });

    it("Should revert if adding a task with an empty description", async () => {
      const { polling, owner, director1 } = await deployFixture();

      await polling.connect(owner).addDirector(director1, "Director1");

      const title = "Task 1";
      const description = "";

      await expect(
        polling.connect(director1).addTask(title, description)
      ).to.be.revertedWith("Description cannot be empty!");
    });

    it("Should revert if adding a task with an existing title", async () => {
      const { polling, owner, director1 } = await deployFixture();

      await polling.connect(owner).addDirector(director1, "Director1");

      const title = "Task 1";
      const description = "Task 1 description.";

      await polling.connect(director1).addTask(title, description);

      await expect(
        polling.connect(director1).addTask(title, description)
      ).to.be.revertedWith("A task with the same title is already added!");
    });

    it("Should add a Task", async () => {
      const { polling, owner } = await deployFixture();

      const title = "Task 1";
      const description = "Task 1 description.";

      await polling.connect(owner).addTask(title, description);

      const tasks = await polling.getTasks();

      expect(tasks.length).to.equal(1);
    });
  });

  describe("Approving a Task", () => {
    it("Should revert if approving a task from a non-stakeholder account", async () => {
      const { polling, director1, owner } = await deployFixture();

      const title = "Task 1";
      const description = "Task 1 description.";

      await polling.connect(owner).addTask(title, description);

      const tasks = await polling.getTasks();

      await expect(
        polling.connect(director1).approveTask(tasks[0].id)
      ).to.be.revertedWithCustomError(polling, "Unauthorized");
    });

    it("Should revert if approving an already approved task", async () => {
      const { polling, owner, stakeHolder1, stakeHolder2, otherAccount } =
        await deployFixture();

      const title = "Task 1";
      const description = "Task 1 description.";

      await polling
        .connect(stakeHolder1)
        .stakeAmount("Stakeholder 1", { value: minimumStakingAmount });

      await polling
        .connect(stakeHolder2)
        .stakeAmount("Stakeholder 1", { value: minimumStakingAmount });

      await polling
        .connect(otherAccount)
        .stakeAmount("Stakeholder 1", { value: minimumStakingAmount });

      await polling.connect(owner).addTask(title, description);

      const tasks = await polling.getTasks();

      await polling.connect(stakeHolder1).approveTask(tasks[0].id);
      await polling.connect(stakeHolder2).approveTask(tasks[0].id);

      await expect(
        polling.connect(stakeHolder1).approveTask(tasks[0].id)
      ).to.be.revertedWith("Task already approved by you!");

      await expect(
        polling.connect(otherAccount).approveTask(tasks[0].id)
      ).to.be.revertedWith("Task already approved!");
    });

    it("Should approve a task when no stakeholder is added", async () => {
      const { polling, owner } = await deployFixture();

      const title = "Task 1";
      const description = "Task 1 description.";

      await polling.connect(owner).addTask(title, description);

      const tasks = await polling.getTasks();

      expect(tasks[0].isApproved).to.equal(true);
    });

    it("Should approve a task when stakeholders are added", async () => {
      const { polling, owner, stakeHolder1 } = await deployFixture();

      const title = "Task 1";
      const description = "Task 1 description.";

      await polling
        .connect(stakeHolder1)
        .stakeAmount("Stakeholder 1", { value: minimumStakingAmount });

      await polling.connect(owner).addTask(title, description);

      const tasksBefore = await polling.getTasks();

      await polling.connect(stakeHolder1).approveTask(tasksBefore[0].id);

      const tasksAfter = await polling.getTasks();

      expect(tasksAfter[0].isApproved).to.equal(true);
    });
  });

  describe("Get role of an account", () => {
    it("Should return the correct role of each role type", async () => {
      const { polling, owner, director1, stakeHolder1, otherAccount } =
        await deployFixture();

      await polling.connect(owner).addDirector(director1, "Director1");

      await polling
        .connect(stakeHolder1)
        .stakeAmount("Stakeholder 1", { value: minimumStakingAmount });

      expect(await polling.getRole(owner.address)).to.equal("Owner");
      expect(await polling.getRole(director1.address)).to.equal("Director");
      expect(await polling.getRole(stakeHolder1.address)).to.equal(
        "Stakeholder"
      );
      expect(await polling.getRole(otherAccount.address)).to.equal("User");
    });
  });

  describe("Get username of an account", () => {
    it("Should return the correct username of each role type", async () => {
      const { polling, owner, director1, stakeHolder1, otherAccount } =
        await deployFixture();

      await polling.connect(owner).addDirector(director1, "Director 1");

      await polling
        .connect(stakeHolder1)
        .stakeAmount("Stakeholder 1", { value: minimumStakingAmount });

      expect(await polling.getUserName(owner)).to.equal("John Doe");
      expect(await polling.getUserName(director1)).to.equal("Director 1");
      expect(await polling.getUserName(stakeHolder1)).to.equal("Stakeholder 1");
      expect(await polling.getUserName(otherAccount)).to.equal("External");
    });
  });
});
