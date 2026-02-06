export const statusClasses = (status: string) => {
  switch (status) {
    case "completed":
      return " text-emerald-700 dark:text-emerald-700 bg-emerald-200/60 dark:bg-emerald-900/30 ";
    case "running":
      return " text-gray-700 dark:text-gray-400 bg-gray-200/60 dark:bg-neutral-800/30 ";
    case "error":
      return " text-red-700 dark:text-red-700 bg-red-200/60 dark:bg-red-900/30";
    case "interrupted":
      return " text-amber-700 dark:text-amber-700 bg-amber-200/60 dark:bg-amber-900/30 ";
    case "skipped":
      return " text-gray-500 dark:text-gray-400 bg-gray-300/60 dark:bg-neutral-700/40 ";
    default:
      return " text-gray-700 dark:text-gray-400 bg-gray-200/60 dark:bg-neutral-800/30 ";
  }
};