interface TableHeadDataProps {
  className?: string;
  data: string;
}

export const TableHeadData = ({ className = "", data }: TableHeadDataProps) => {
  return (
    <td
      className={`p-3 text-[#8cdcfe] ${
        data === "" ? "min-w-[40px]" : "min-w-[180px]"
      } ${className}`}
    >
      {data}
    </td>
  );
};
