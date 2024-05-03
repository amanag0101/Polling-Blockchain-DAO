import Skeleton from "./skeleton";
import { TableRow } from "./table-row";

interface TableProps {
  loading: boolean;
  tableHeadData: React.ReactNode;
  tableBodyData: React.ReactNode;
}

const Table = ({ loading, tableHeadData, tableBodyData }: TableProps) => {
  return (
    <div
      className={`h-full flex flex-col justify-between gap-4 overflow-auto ${
        Array.isArray(tableBodyData) && tableBodyData?.length === 0
          ? "hidden"
          : ""
      }`}
    >
      {loading ? (
        <Skeleton className="px-2" />
      ) : (
        <div className={`overflow-auto`}>
          <table className="w-full">
            <thead className="sticky top-0">
              <TableRow data={tableHeadData} />
            </thead>

            <tbody>{tableBodyData}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Table;
