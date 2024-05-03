import React, { useContext, useEffect, useRef, useState } from "react";
import { Contract } from "ethers";
import { convertEpochSecondsToDate } from "../utils/utils";
import { TableHeadData } from "./ui/table-head-data";
import Table from "./ui/table";
import { TableRow } from "./ui/table-row";
import { TableBodyData } from "./ui/table-body-data";
import { ToastContext } from "../context/toast-context";

interface Director {
  createdAt: string;
  address: string;
  name: string;
}

interface DirectorProps {
  contract: Contract;
  userRole: string | null;
}

const Director = ({ contract, userRole }: DirectorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { setToast, setToastKey } = useContext(ToastContext);

  const [loading, setLoading] = useState(false);
  const [directorName, setDirectorName] = useState("");
  const [directorAddress, setDirectorAddress] = useState("");
  const [directors, setDirectors] = useState<Director[]>([]);
  const tableHeadData = ["Name", "Address", "Created At"];

  const getDirectors = async () => {
    try {
      setLoading(true);
      const directors = await contract.getDirectors();
      setDirectors(
        directors.map((director: any) => ({
          createdAt: director[0],
          address: director[1],
          name: director[2],
        }))
      );
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

  const addDirector = async (directorName: string, directorAddress: string) => {
    try {
      setLoading(true);
      const tx = await contract.addDirector(directorAddress, directorName);
      await tx.wait();
      setToast({
        message: "Director added scuccessfully.",
        type: "success",
      });
      setToastKey((prev) => prev + 1);
      setDirectorAddress("");
      setDirectorName("");
      await getDirectors();
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
    getDirectors();
  }, [contract]);

  const renderTableHead = tableHeadData.map((column) => (
    <TableHeadData key={column} data={column} />
  ));

  const renderTableBody = directors.map((director) => (
    <TableRow
      key={director.address}
      data={
        <>
          <TableBodyData data={director.name} />
          <TableBodyData className="text-[#fd7500]" data={director.address} />
          <TableBodyData
            className="text-gray-500"
            data={convertEpochSecondsToDate(parseInt(director.createdAt))}
          />
        </>
      }
    ></TableRow>
  ));

  return (
    <div ref={containerRef} className="flex flex-col gap-4 p-4">
      <p className="text-lg font-bold">Directors {`(${directors.length})`}</p>

      <Table
        loading={loading}
        tableHeadData={renderTableHead}
        tableBodyData={renderTableBody}
      />

      <div className="flex flex-col gap-4">
        <p className="text-lg font-bold">Add Director</p>

        <div className="flex flex-col gap-2">
          <input
            className="bg-[#1f1f1f] p-2 w-full"
            value={directorName}
            placeholder="Enter director name"
            type="text"
            disabled={loading || userRole !== "Owner"}
            onChange={(e) => setDirectorName(e.target.value)}
          />
          <input
            className="bg-[#1f1f1f] p-2 w-full"
            value={directorAddress}
            placeholder="Enter director address"
            type="text"
            disabled={loading || userRole !== "Owner"}
            onChange={(e) => setDirectorAddress(e.target.value)}
          />

          <button
            className={`${
              userRole === "Owner" ? "bg-[#1f88d9]" : "bg-gray-500"
            } p-2 w-full`}
            disabled={loading || userRole !== "Owner"}
            onClick={() => {
              addDirector(directorName, directorAddress);
            }}
          >
            Add Director
          </button>
        </div>
      </div>
    </div>
  );
};

export default Director;
