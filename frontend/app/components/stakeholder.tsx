import { Contract, ethers } from "ethers";
import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  convertEpochSecondsToDate,
  convertToEther,
  convertToInteger,
} from "../utils/utils";
import { TableHeadData } from "./ui/table-head-data";
import Table from "./ui/table";
import { TableRow } from "./ui/table-row";
import { TableBodyData } from "./ui/table-body-data";
import { ToastContext } from "../context/toast-context";

export interface StakeHolder {
  stakedAt: string;
  address: string;
  name: string;
  stakedAmount: number;
}

interface StakeHolderProps {
  contract: Contract;
  userRole: string | null;
  setReloadHeader: Dispatch<SetStateAction<boolean>>;
}

const Stakeholder = ({
  contract,
  userRole,
  setReloadHeader,
}: StakeHolderProps) => {
  const { setToast, setToastKey } = useContext(ToastContext);

  const [loading, setLoading] = useState(false);
  const [stakeHolders, setStakeHolders] = useState<StakeHolder[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);

  const tableHeadData = ["Name", "Address", "Amount Staked", "Staked On"];

  const getStakeHolders = async () => {
    try {
      setLoading(true);
      const response = await contract.getStakeholders();
      const stakeHolders: StakeHolder[] = [];

      response.forEach((items: any) => {
        const item = {
          stakedAt: convertEpochSecondsToDate(convertToInteger(items[0])),
          address: items[2],
          name: items[3],
          stakedAmount: convertToEther(items[4]),
        };
        if (item.stakedAmount > 0) stakeHolders.push(item);
      });
      setStakeHolders(stakeHolders);
      setLoading(false);
    } catch (error: any) {
      console.error(error);
      setToast({
        message: error?.reason || error?.message || "Some error occurred.",
        type: "error",
      });
      setToastKey((prev) => prev + 1);
      setLoading(false);
    }
  };

  const stakeAmount = async (name: string, amount: number) => {
    try {
      setLoading(true);
      const tx = await contract.stakeAmount(name, {
        value: ethers.parseEther(amount.toString()),
      });
      tx.wait();
      setReloadHeader((prev) => !prev);
      setToast({
        message: "Amount staked successfully.",
        type: "success",
      });
      setToastKey((prev) => prev + 1);
      setName("");
      await getStakeHolders();
    } catch (error: any) {
      console.error(error);
      setToast({
        message: error?.reason || error?.message || "Some error occurred.",
        type: "error",
      });
      setToastKey((prev) => prev + 1);
      setLoading(false);
    }
  };

  const withdrawAmount = async (amount: number) => {
    try {
      setLoading(true);
      const tx = await contract.withdrawAmount(
        ethers.parseEther(amount.toString())
      );
      await tx.wait();
      setReloadHeader((prev) => !prev);
      setToast({
        message: "Amount withdrawn successfully.",
        type: "success",
      });
      await getStakeHolders();
    } catch (error: any) {
      console.error(error);
      setToast({
        message: error?.reason || error?.message || "Some error occurred.",
        type: "error",
      });
      setToastKey((prev) => prev + 1);
      setLoading(false);
    }
  };

  useEffect(() => {
    getStakeHolders();
  }, [contract]);

  const renderTableHead = tableHeadData.map((column) => (
    <TableHeadData key={column} data={column} />
  ));

  const renderTableBody = stakeHolders.map((stakeholder) => (
    <TableRow
      key={stakeholder.address}
      data={
        <>
          <TableBodyData data={stakeholder.name} />
          <TableBodyData
            className="text-[#fd7500]"
            data={stakeholder.address}
          />
          <TableBodyData
            className="text-[#ffe821]"
            data={stakeholder.stakedAmount + " ETH"}
          />
          <TableBodyData
            className="text-gray-500"
            data={stakeholder.stakedAt}
          />
        </>
      }
    ></TableRow>
  ));

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-lg font-bold">
        Stakeholders {`(${stakeHolders.length})`}
      </p>

      <Table
        loading={loading}
        tableHeadData={renderTableHead}
        tableBodyData={renderTableBody}
      />

      <div className="flex flex-col gap-4">
        <p className="text-lg font-bold">Stake amount</p>

        <div className="flex flex-col gap-2">
          <input
            className="bg-[#1f1f1f] p-2 w-full"
            value={name}
            placeholder="Enter stakeholder name"
            type="text"
            disabled={
              loading || (userRole !== "Stakeholder" && userRole !== "User")
            }
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex">
            <input
              className="bg-[#1f1f1f] p-2 w-full"
              placeholder="Amount"
              type="number"
              disabled={
                loading || (userRole !== "Stakeholder" && userRole !== "User")
              }
              onChange={(e) => setAmount(parseInt(e.target.value))}
            />
            <button
              className={`${
                userRole === "Stakeholder" || userRole === "User"
                  ? "bg-[#33bcb0]"
                  : "bg-gray-500"
              } p-2 w-full`}
              disabled={
                loading || (userRole !== "Stakeholder" && userRole !== "User")
              }
              onClick={() => stakeAmount(name, amount)}
            >
              Stake
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-lg font-bold">Withdraw amount</p>
        <div className="flex">
          <input
            className="bg-[#1f1f1f] p-2 w-full"
            placeholder="Amount"
            type="number"
            disabled={loading || userRole !== "Stakeholder"}
            onChange={(e) => setAmount(parseInt(e.target.value))}
          />
          <button
            className={`${
              userRole === "Stakeholder" ? "bg-[#b51414]" : "bg-gray-500"
            } p-2 w-full`}
            disabled={loading || userRole !== "Stakeholder"}
            onClick={() => withdrawAmount(amount)}
          >
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
};

export default Stakeholder;
