import { Contract } from "ethers";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  convertEpochSecondsToDate,
  convertToEther,
  convertToInteger,
} from "../utils/utils";
import { StakeHolder } from "./stakeholder";
import Table from "./ui/table";
import { TableHeadData } from "./ui/table-head-data";
import { TableRow } from "./ui/table-row";
import { TableBodyData } from "./ui/table-body-data";
import { ToastContext } from "../context/toast-context";

interface Task {
  createdAt: string;
  id: number;
  createdBy: string;
  createdByUserName: string;
  title: string;
  description: string;
  approvedBy: string[];
  isApproved: boolean;
}

interface TaskProps {
  contract: Contract;
  userRole: string | null;
}

const Task = ({ contract, userRole }: TaskProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { setToast, setToastKey } = useContext(ToastContext);

  const [loading, setLoading] = useState<boolean>(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [stakeHolders, setStakeHolders] = useState<StakeHolder[]>([]);

  const tableHeadData = [
    "Title",
    "Description",
    "Votes Received",
    "Approved",
    "Created By",
    "Created On",
    "Action",
  ];

  const getTasks = async () => {
    try {
      setLoading(true);

      const response = await contract.getTasks();
      const tasks: Task[] = [];

      await Promise.all(
        response.map(async (item: any) => {
          const createdByUserName = await contract.getUserName(item[2]);
          const task: Task = {
            createdAt: convertEpochSecondsToDate(convertToInteger(item[0])),
            id: convertToInteger(item[1]),
            createdBy: item[2],
            createdByUserName: createdByUserName,
            title: item[3],
            description: item[4],
            approvedBy: item[5]?.map((address: string) => address),
            isApproved: item[6],
          };
          tasks.push(task);
        })
      );

      setTasks(tasks);
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

  const addTask = async (title: string, description: string) => {
    try {
      setLoading(true);
      const tx = await contract.addTask(title, description);
      await tx.wait();
      setToast({
        message: "Task addedd successfully.",
        type: "success",
      });
      setToastKey((prev) => prev + 1);
      setTitle("");
      setDescription("");
      await getTasks();
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

  const approveTask = async (taskId: number) => {
    try {
      setLoading(true);
      const tx = await contract.approveTask(taskId);
      await tx.wait();
      setToast({
        message: "Task approved successfully.",
        type: "success",
      });
      setToastKey((prev) => prev + 1);
      await getTasks();
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
    getTasks();
    getStakeHolders();
  }, [contract]);

  const renderTableHead = tableHeadData.map((column) => (
    <TableHeadData key={column} data={column} />
  ));

  const renderTableBody = tasks.map((task) => (
    <TableRow
      key={task.title}
      data={
        <>
          <TableBodyData data={task.title} />
          <TableBodyData data={task.description} />
          <TableBodyData
            className={task.isApproved ? "text-[#33bcb0]" : "text-[#b51414]"}
            data={task.approvedBy.length}
            // data={task.approvedBy.length + " / " + stakeHolders.length}
          />
          <TableBodyData data={task.isApproved ? "Yes" : "No"} />
          <TableBodyData
            data={
              <>
                <span className="text-[#fd7500]">{task.createdBy}</span>
                <span className="text-gray-500">{` (${task.createdByUserName})`}</span>
              </>
            }
          />
          <TableBodyData className="text-gray-500" data={task.createdAt} />
          <TableBodyData
            data={
              <button
                className={`${
                  userRole === "Stakeholder" ? "bg-[#33bcb0]" : "bg-gray-500"
                } px-2 py-1 w-full`}
                disabled={userRole !== "Stakeholder"}
                onClick={() => approveTask(task.id)}
              >
                Approve
              </button>
            }
          />
        </>
      }
    ></TableRow>
  ));

  return (
    <div ref={containerRef} className="flex flex-col gap-4 p-4">
      <p className="text-lg font-bold">Tasks {`(${tasks.length})`}</p>
      <Table
        loading={loading}
        tableHeadData={renderTableHead}
        tableBodyData={renderTableBody}
      />

      <div className="flex flex-col gap-4">
        <p className="text-lg font-bold">Add Task</p>

        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Enter task title"
            className="bg-[#1f1f1f] p-2 w-full"
            disabled={
              loading || (userRole !== "Owner" && userRole !== "Director")
            }
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            placeholder="Enter task description"
            className="bg-[#1f1f1f] p-2 w-full"
            disabled={
              loading || (userRole !== "Owner" && userRole !== "Director")
            }
            onChange={(e) => setDescription(e.target.value)}
          />

          <button
            className={`${
              userRole === "Owner" || userRole === "Director"
                ? "bg-[#1f88d9]"
                : "bg-gray-500"
            } p-2 w-full`}
            disabled={
              loading || (userRole !== "Owner" && userRole !== "Director")
            }
            onClick={() => addTask(title, description)}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default Task;
