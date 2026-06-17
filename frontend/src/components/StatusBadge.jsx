const styles = {
  PENDING:  "bg-yellow-900/40 text-yellow-300 border border-yellow-700",
  SETTLED:  "bg-green-900/40  text-green-300  border border-green-700",
  DISPUTED: "bg-red-900/40    text-red-300    border border-red-700",
  REFUNDED: "bg-blue-900/40   text-blue-300   border border-blue-700",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status] || "bg-gray-700 text-gray-300"}`}>
      {status}
    </span>
  );
}
