import type { HTMLAttributes, ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

export function DataTableContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-full overflow-x-auto rounded-2xl border border-[#DCEAF3] bg-white shadow-2xs ${className}`}>
      {children}
    </div>
  )
}

export function DataTable({ children, className = '', ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={`w-full border-collapse text-left text-sm text-[#243B53] ${className}`} {...rest}>
      {children}
    </table>
  )
}

export function DataTableHead({ children, className = '', ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`border-b border-[#DCEAF3] bg-[#F5FAFE] text-xs font-bold uppercase tracking-wider text-[#64748B] ${className}`} {...rest}>
      {children}
    </thead>
  )
}

export function DataTableHeaderCell({ children, className = '', ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className={`px-4 py-3.5 ${className}`} {...rest}>
      {children}
    </th>
  )
}

export function DataTableRow({ children, className = '', ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`border-b border-[#DCEAF3] transition-colors last:border-b-0 hover:bg-[#F5FAFE] ${className}`} {...rest}>
      {children}
    </tr>
  )
}

export function DataTableCell({ children, className = '', ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3.5 ${className}`} {...rest}>
      {children}
    </td>
  )
}
