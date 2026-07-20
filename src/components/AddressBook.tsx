import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, MapPin, MoreVertical, Check } from 'lucide-react';
import './AddressBook.css';

export interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

const MOCK_ADDRESSES: Address[] = [
  { id: '1', name: 'Home', street: '123 Memory Lane, Apt 4B', city: 'San Francisco', state: 'CA', zip: '94110', isDefault: true },
  { id: '2', name: 'Work', street: '456 Startup Blvd', city: 'San Francisco', state: 'CA', zip: '94107', isDefault: false }
];

interface AddressBookProps {
  onBack: () => void;
  onSelect?: (address: Address) => void;
  isPickerMode?: boolean;
}

export const AddressBook: React.FC<AddressBookProps> = ({ onBack, onSelect, isPickerMode }) => {
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddr, setNewAddr] = useState<Partial<Address>>({});

  const handleSave = () => {
    if (!newAddr.street || !newAddr.city) return;
    const a: Address = {
      id: Math.random().toString(),
      name: newAddr.name || 'New Address',
      street: newAddr.street,
      city: newAddr.city,
      state: newAddr.state || '',
      zip: newAddr.zip || '',
      isDefault: addresses.length === 0
    };
    setAddresses([...addresses, a]);
    setShowAdd(false);
    setNewAddr({});
  };

  const setDefault = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
  };

  return (
    <motion.div 
      className="address-book-wrap"
      initial={{ opacity: 0, x: isPickerMode ? 0 : 20, y: isPickerMode ? 20 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: isPickerMode ? 0 : -20, y: isPickerMode ? 20 : 0 }}
    >
      <div className="address-header">
        <button className="address-back" onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <h2 className="address-title">{isPickerMode ? 'Select Address' : 'Shipping Addresses'}</h2>
        <div style={{ width: 24 }} />
      </div>

      <div className="address-body">
        {addresses.length === 0 ? (
          <div className="address-empty">
            <div className="address-empty-icon"><MapPin size={32} /></div>
            <h3>No addresses yet</h3>
            <p>Save your shipping addresses for faster checkout.</p>
          </div>
        ) : (
          <div className="address-list">
            {addresses.map(addr => (
              <button 
                key={addr.id} 
                className={`address-card ${isPickerMode ? 'picker-mode' : ''}`}
                onClick={() => isPickerMode && onSelect?.(addr)}
              >
                <div className="address-card-main">
                  <div className="address-card-header">
                    <span className="address-name">{addr.name}</span>
                    {addr.isDefault && <span className="address-badge">Default</span>}
                  </div>
                  <p className="address-text">{addr.street}</p>
                  <p className="address-text">{addr.city}, {addr.state} {addr.zip}</p>
                </div>
                {!isPickerMode && (
                  <div className="address-card-actions">
                    {!addr.isDefault && (
                      <button className="address-set-default" onClick={(e) => setDefault(addr.id, e)}>
                        Set Default
                      </button>
                    )}
                    <button className="address-more" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical size={20} />
                    </button>
                  </div>
                )}
                {isPickerMode && addr.isDefault && (
                  <div className="address-check">
                    <Check size={20} color="var(--accent)" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {!showAdd && (
        <div className="address-fab-wrap">
          <button className="address-fab" onClick={() => setShowAdd(true)}>
            <Plus size={24} color="#fff" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            className="address-add-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="sheet-header">
              <h3>Add New Address</h3>
              <button className="sheet-close" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
            <div className="auth-fields">
              <div className="field-group">
                <label className="field-label">Name (e.g. Home, Office)</label>
                <input className="field-input" onChange={e => setNewAddr({...newAddr, name: e.target.value})} />
              </div>
              <div className="field-group">
                <label className="field-label">Street Address</label>
                <input className="field-input" onChange={e => setNewAddr({...newAddr, street: e.target.value})} />
              </div>
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label">City</label>
                  <input className="field-input" onChange={e => setNewAddr({...newAddr, city: e.target.value})} />
                </div>
                <div className="field-group" style={{ flex: 0.5 }}>
                  <label className="field-label">State</label>
                  <input className="field-input" onChange={e => setNewAddr({...newAddr, state: e.target.value})} />
                </div>
                <div className="field-group" style={{ flex: 0.5 }}>
                  <label className="field-label">Zip</label>
                  <input className="field-input" onChange={e => setNewAddr({...newAddr, zip: e.target.value})} />
                </div>
              </div>
            </div>
            <button className="auth-btn-primary" style={{ marginTop: 24 }} onClick={handleSave}>
              Save Address
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
