'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Option {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = 'Select...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 50 : 1 }}>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearchTerm(''); }}
        style={{
          padding: '10px 14px',
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '8px',
          color: selectedOption ? '#0F172A' : '#64748B',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: selectedOption ? '600' : 'normal' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '6px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          zIndex: 50,
          boxShadow: '0 10px 25px rgba(0,0,0,0.12), 0 4px 6px rgba(0,0,0,0.05)',
          maxHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <input 
            autoFocus
            type="text" 
            placeholder="Search..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              margin: '8px',
              padding: '8px 12px',
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              color: '#0F172A',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
          <div style={{ overflowY: 'auto', paddingBottom: '6px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '10px 14px', color: '#64748B', fontSize: '0.88rem' }}>No matches found</div>
            ) : (
              filteredOptions.map(opt => (
                <div 
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 14px',
                    color: opt.value === value ? '#2563EB' : '#0F172A',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: opt.value === value ? '700' : 'normal',
                    background: value === opt.value ? '#EFF6FF' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (opt.value !== value) e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (opt.value !== value) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
