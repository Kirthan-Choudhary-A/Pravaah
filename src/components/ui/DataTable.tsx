import React from 'react';
import styles from './DataTable.module.css';

export interface Column<T> {
  readonly key: string;
  readonly header: React.ReactNode;
  readonly render: (row: T, index: number) => React.ReactNode;
  readonly align?: 'left' | 'center' | 'right';
  readonly width?: string;
}

export interface DataTableProps<T> {
  readonly caption: string;
  readonly captionHidden?: boolean;
  readonly columns: readonly Column<T>[];
  readonly data: readonly T[];
  readonly getRowKey: (row: T, index: number) => string;
  readonly onRowClick?: (row: T) => void;
  readonly emptyMessage?: string;
  readonly className?: string;
}

export function DataTable<T>({
  caption,
  captionHidden = false,
  columns,
  data,
  getRowKey,
  onRowClick,
  emptyMessage = 'No records found.',
  className = '',
}: DataTableProps<T>): React.ReactElement {
  return (
    <div className={`${styles.tableContainer} ${className}`.trim()}>
      <table className={styles.table}>
        <caption className={captionHidden ? styles.srOnly : styles.caption}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{ width: col.width, textAlign: col.align || 'left' }}
                className={styles.th}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const isClickable = Boolean(onRowClick);
              return (
                <tr
                  key={getRowKey(row, index)}
                  onClick={() => onRowClick?.(row)}
                  className={isClickable ? styles.clickableRow : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick?.(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align || 'left' }}
                      className={styles.td}
                    >
                      {col.render(row, index)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
