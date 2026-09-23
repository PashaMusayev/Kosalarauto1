import React from 'react';
import { DetailSpecTable, DetailSpecTableProps } from './DetailSpecTable';

export type DetailMobileSpecsProps = DetailSpecTableProps;

export const DetailMobileSpecs: React.FC<DetailMobileSpecsProps> = (props) => {
  return (
    <div className="border-b border-slate-200 pb-3 md:hidden">
      <DetailSpecTable {...props} />
    </div>
  );
};
