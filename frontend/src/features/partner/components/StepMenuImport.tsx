import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Button from '../../../components/Button';
import type { StagedMenuItem } from '../../../types';

interface StepMenuImportProps {
  stagedMenuItems: StagedMenuItem[];
  onChangeMenuItems: (items: StagedMenuItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const SAMPLE_TEMPLATE_DATA = [
  { Name: 'Paneer Butter Masala', Category: 'Main Course', Price: 280, Veg: 'Yes', Description: 'Rich cottage cheese gravy' },
  { Name: 'Chicken Biryani', Category: 'Biryani', Price: 340, Veg: 'No', Description: 'Aromatic Dum Biryani with raita' },
  { Name: 'Garlic Naan', Category: 'Breads', Price: 60, Veg: 'Yes', Description: 'Freshly baked butter garlic naan' },
  { Name: 'Mango Lassi', Category: 'Beverages', Price: 90, Veg: 'Yes', Description: 'Chilled sweet mango yogurt drink' },
];

export const StepMenuImport: React.FC<StepMenuImportProps> = ({
  stagedMenuItems,
  onChangeMenuItems,
  onNext,
  onBack,
}) => {
  const [parsing, setParsing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_DATA);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Menu Template');
    XLSX.writeFile(workbook, 'foody_menu_sample_template.xlsx');
  };

  // Parse Excel / CSV File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);

        if (rawRows.length === 0) {
          setError('The uploaded file contains no menu item rows.');
          setParsing(false);
          return;
        }

        // Normalize rows to StagedMenuItem structure
        const parsedItems: StagedMenuItem[] = rawRows.map((row) => {
          const name = String(row['Name'] || row['Item Name'] || row['name'] || '').trim();
          const category = String(row['Category'] || row['category'] || 'Main Course').trim();
          const priceVal = parseFloat(row['Price'] || row['Cost'] || row['price'] || '0');
          const desc = String(row['Description'] || row['desc'] || '').trim();
          const vegVal = String(row['Veg'] || row['IsVeg'] || row['veg'] || 'yes').toLowerCase();

          return {
            name: name || 'Unnamed Item',
            category: category || 'General',
            price: isNaN(priceVal) ? 0 : priceVal,
            description: desc,
            isVeg: vegVal.includes('yes') || vegVal.includes('true') || vegVal === 'veg',
          };
        });

        onChangeMenuItems(parsedItems);
      } catch (err: any) {
        setError('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      } finally {
        setParsing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Inline Row Editor
  const handleItemChange = (index: number, field: keyof StagedMenuItem, value: any) => {
    const updated = [...stagedMenuItems];
    updated[index] = { ...updated[index], [field]: value };
    onChangeMenuItems(updated);
  };

  // Add Manual Row
  const handleAddManualRow = () => {
    onChangeMenuItems([
      ...stagedMenuItems,
      { name: '', category: 'Main Course', price: 100, description: '', isVeg: true },
    ]);
  };

  // Delete Row
  const handleDeleteRow = (index: number) => {
    const updated = stagedMenuItems.filter((_, idx) => idx !== index);
    onChangeMenuItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedMenuItems.length === 0) {
      setError('Please import an Excel menu file or add at least one menu item.');
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px', fontFamily: 'var(--font-display)' }}>
        Step 4: Bulk Menu Import & Live Preview
      </h3>
      <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
        Upload an Excel or CSV menu file to populate your restaurant menu instantly.
      </p>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Excel Upload Box & Template Download Bar */}
      <div style={{ marginBottom: '24px', backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', display: 'block' }}>📊 Bulk Import Menu File</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Supports .xlsx, .xls, and .csv files</span>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            style={{
              fontSize: '12px',
              padding: '6px 14px',
              backgroundColor: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
              borderRadius: '9999px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📥 Download Sample Template
          </button>
        </div>

        <div style={{ position: 'relative', border: '2px dashed #CBD5E1', borderRadius: '12px', padding: '20px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>📁</div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
            {parsing ? 'Parsing Excel Rows...' : 'Click to select or drag Excel menu file here'}
          </p>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            disabled={parsing}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Live Editable Table */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
            📋 Parsed Menu Preview ({stagedMenuItems.length} Items)
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleAddManualRow}
              style={{ fontSize: '12px', padding: '4px 12px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              + Add Item Row
            </button>
            {stagedMenuItems.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeMenuItems([])}
                style={{ fontSize: '12px', padding: '4px 12px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {stagedMenuItems.length > 0 ? (
          <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 12px' }}>#</th>
                  <th style={{ padding: '10px 12px' }}>Item Name</th>
                  <th style={{ padding: '10px 12px' }}>Category</th>
                  <th style={{ padding: '10px 12px' }}>Price (₹)</th>
                  <th style={{ padding: '10px 12px' }}>Type</th>
                  <th style={{ padding: '10px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stagedMenuItems.map((item, index) => (
                  <tr key={index} style={{ borderTop: '1px solid #E2E8F0', backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                    <td style={{ padding: '8px 12px', color: '#94A3B8', fontWeight: 600 }}>{index + 1}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="Item name"
                        style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                        placeholder="Category"
                        style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', width: '90px' }}>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', width: '90px' }}>
                      <button
                        type="button"
                        onClick={() => handleItemChange(index, 'isVeg', !item.isVeg)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: item.isVeg ? '#DCFCE7' : '#FEE2E2',
                          color: item.isVeg ? '#166534' : '#991B1B',
                          cursor: 'pointer',
                        }}
                      >
                        {item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                      </button>
                    </td>
                    <td style={{ padding: '8px 12px', width: '60px' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(index)}
                        style={{ color: '#EF4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1', color: '#94A3B8' }}>
            No menu items imported yet. Upload an Excel file above or click <strong>+ Add Item Row</strong>.
          </div>
        )}
      </div>

      {/* Navigation Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <Button type="button" variant="secondary" onClick={onBack}>
          ← Back to Step 3
        </Button>
        <Button type="submit" variant="primary">
          Next: Final Review →
        </Button>
      </div>
    </form>
  );
};

export default StepMenuImport;
