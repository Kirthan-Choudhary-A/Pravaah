import React, { useState, useMemo } from 'react';
import { usePlan } from '@state/PlanContext';
import {
  maskPlate,
  maskAadhaar,
  maskDL,
  maskChassis,
  maskEngine,
  validatePurpose,
  VALID_PURPOSES,
} from '@engine';
import type { HouseholdVehicle, AuditEntry } from '@engine/model/types';
import { Banner } from '@components/ui/Banner';
import { Button } from '@components/ui/Button';
import { SegmentedControl } from '@components/ui/SegmentedControl';
import { DataTable, type Column } from '@components/ui/DataTable';
import { StatusTag } from '@components/ui/StatusTag';
import styles from './HouseholdPage.module.css';

interface RevealModalState {
  readonly isOpen: boolean;
  readonly field: string;
  readonly fieldLabel: string;
  readonly rawValue: string;
  readonly vehiclePlate: string;
}

export const HouseholdPage: React.FC = () => {
  const {
    householdVehicles,
    consents,
    auditLog,
    activeRole,
    revealedFields,
    setActiveRole,
    requestConsent,
    grantConsentAction,
    declineConsentAction,
    revokeConsentAction,
    revealFieldAction,
    hideFieldAction,
    addVehicleAction,
    clearAuditLogAction,
  } = usePlan();

  // Reveal Modal State
  const [revealModal, setRevealModal] = useState<RevealModalState>({
    isOpen: false,
    field: '',
    fieldLabel: '',
    rawValue: '',
    vehiclePlate: '',
  });

  const [selectedPurpose, setSelectedPurpose] = useState<string>(VALID_PURPOSES[0]);
  const [customJustification, setCustomJustification] = useState<string>('');
  const [revealError, setRevealError] = useState<string | null>(null);

  // Add Vehicle Modal State
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('Car');
  const [newVehicleTab, setNewVehicleTab] = useState<'existing' | 'new_reg'>('existing');
  const [addVehicleError, setAddVehicleError] = useState<string | null>(null);

  // Audit Filters
  const [actorFilter, setActorFilter] = useState<'All' | 'You' | 'Family member'>('All');
  const [actionFilter, setActionFilter] = useState<'All' | 'request' | 'grant' | 'decline' | 'revoke' | 'reveal'>('All');

  // Active view consent from Family Member to You
  const activeConsent = useMemo(() => {
    return (
      consents.find(
        (c) =>
          c.grantorRole === 'Family member' &&
          c.granteeRole === 'You' &&
          c.status === 'granted'
      ) ?? null
    );
  }, [consents]);

  const pendingRequestsForFamily = useMemo(() => {
    return consents.filter(
      (c) => c.grantorRole === 'Family member' && c.status === 'pending'
    );
  }, [consents]);

  // Open reveal modal
  const openReveal = (field: string, fieldLabel: string, rawValue: string, vehiclePlate: string) => {
    setRevealModal({
      isOpen: true,
      field,
      fieldLabel,
      rawValue,
      vehiclePlate,
    });
    setSelectedPurpose(VALID_PURPOSES[0]);
    setCustomJustification('');
    setRevealError(null);
  };

  const closeReveal = () => {
    setRevealModal({
      isOpen: false,
      field: '',
      fieldLabel: '',
      rawValue: '',
      vehiclePlate: '',
    });
    setRevealError(null);
  };

  const handleExecuteReveal = (e: React.FormEvent) => {
    e.preventDefault();
    const purpose =
      selectedPurpose === 'Other'
        ? `Other: ${customJustification}`
        : selectedPurpose;

    const check = validatePurpose(purpose);
    if (!check.valid) {
      setRevealError(check.reason ?? 'Invalid purpose specification.');
      return;
    }

    const res = revealFieldAction({
      field: revealModal.field,
      rawValue: revealModal.rawValue,
      purpose,
    });

    if (!res.ok) {
      setRevealError(res.error);
      return;
    }

    closeReveal();
  };

  // Add Vehicle handler
  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVehicleTab === 'existing') {
      const trimmed = newVehiclePlate.trim().toUpperCase();
      if (trimmed.length < 5) {
        setAddVehicleError('Please provide a valid registration plate number.');
        return;
      }

      const newVehicle: HouseholdVehicle = {
        id: `veh-${Date.now()}`,
        plate: trimmed,
        vehicleType: newVehicleType,
        ownerRole: activeRole,
        renewalItems: [
          {
            id: `item-${Date.now()}-1`,
            name: 'PUC Renewal',
            dueDate: 45,
            duration: 1,
            basis: 'statute',
            verified: false,
            why: 'Periodic pollution clearance test',
          },
        ],
      };

      addVehicleAction(newVehicle);
      setIsAddVehicleOpen(false);
      setNewVehiclePlate('');
      setAddVehicleError(null);
    } else {
      // New vehicle registration under register_new scope
      const newVehicle: HouseholdVehicle = {
        id: `veh-${Date.now()}`,
        plate: `NEW-${Math.floor(1000 + Math.random() * 9000)}`,
        vehicleType: newVehicleType,
        ownerRole: activeRole,
        renewalItems: [
          {
            id: `item-${Date.now()}-form20`,
            name: 'Form 20 Registration Application',
            dueDate: 14,
            duration: 2,
            basis: 'statute',
            verified: false,
            why: 'New vehicle registration mark assignment',
          },
        ],
      };

      addVehicleAction(newVehicle);
      setIsAddVehicleOpen(false);
      setAddVehicleError(null);
    }
  };

  // Download audit log
  const handleDownloadAuditLog = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLog, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'pravaah-audit-log.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtered audit log
  const filteredAuditLog = useMemo(() => {
    return auditLog.filter((entry) => {
      if (actorFilter !== 'All' && entry.actor !== actorFilter) return false;
      if (actionFilter !== 'All' && entry.action !== actionFilter) return false;
      return true;
    });
  }, [auditLog, actorFilter, actionFilter]);

  // Audit columns
  const auditColumns: Column<AuditEntry>[] = [
    {
      key: 'at',
      header: 'Time',
      render: (item) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
          {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (item) => <strong>{item.actor}</strong>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (item) => (
        <span style={{ textTransform: 'uppercase', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
          {item.action}
        </span>
      ),
    },
    {
      key: 'field',
      header: 'Field / Subject',
      render: (item) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
          {item.field} ({item.subject})
        </span>
      ),
    },
    {
      key: 'purpose',
      header: 'Purpose / Details',
      render: (item) => item.purpose || '—',
    },
    {
      key: 'result',
      header: 'Result',
      render: (item) => (
        <span
          style={{
            color: item.result === 'allowed' ? 'var(--status-safe)' : 'var(--charcoal)',
            fontWeight: 600,
            fontSize: 'var(--font-size-xs)',
          }}
        >
          {item.result}
        </span>
      ),
    },
  ];

  return (
    <main className="site-main" id="main-content">
      <div className={styles.pageContainer}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          <div className={styles.titleRow}>
            <h1>Household &amp; Privacy — Family Garage</h1>
            <div className={styles.simulatedBadge}>
              <span aria-hidden="true">🔒</span> SIMULATED DATA ONLY
            </div>
          </div>
          <p className="page-description">
            Manage your personal cars, bikes, and family vehicles in one place. Sensitive Aadhaar,
            chassis, and driving licence numbers stay masked to protect your family’s privacy.
          </p>

          {/* Role Switcher */}
          <div className={styles.roleToggleContainer}>
            <SegmentedControl
              label="Switch Device View"
              value={activeRole}
              onChange={(val) => setActiveRole(val)}
              options={[
                { value: 'You', label: 'You (Citizen Device)' },
                { value: 'Family member', label: 'Family member’s view (SIMULATED)' },
              ]}
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW A: YOU (CITIZEN DEVICE) */}
        {/* ============================================================== */}
        {activeRole === 'You' ? (
          <>
            {/* Consent Banner */}
            {activeConsent ? (
              <Banner
                variant="info"
                title="Active Family Delegation Granted"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <span>
                    Family member granted scopes: <strong>{activeConsent.scopes.join(', ')}</strong>. You can view vehicle renewal deadlines and latest safe dates.
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => revokeConsentAction(activeConsent.id)}
                  >
                    Relinquish Delegation
                  </Button>
                </div>
              </Banner>
            ) : (
              <Banner
                variant="info"
                title="No Active Family Delegation"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <span>
                    To view and manage a family member’s vehicle deadlines, request explicit delegation from their device.
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      requestConsent({
                        grantorRole: 'Family member',
                        vehicleIds: ['KA-03-MJ-4578'],
                        scopes: ['view', 'apply'],
                      });
                    }}
                  >
                    Request Access
                  </Button>
                </div>
              </Banner>
            )}

            {/* Vehicles Header & Add Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)' }}>Household Vehicles</h2>
              <Button variant="primary" size="sm" onClick={() => setIsAddVehicleOpen(true)}>
                + Add a Vehicle
              </Button>
            </div>

            {/* Vehicle Cards Grid */}
            <div className={styles.vehiclesGrid}>
              {householdVehicles.map((v) => {
                const isFamily = v.ownerRole === 'Family member';
                const maskedPlateText = isFamily ? maskPlate(v.plate) : v.plate;

                // Check active reveal states
                const chassisKey = `vehicle.chassis-${v.chassisDemo || ''}`;
                const revealedChassis = revealedFields[chassisKey];

                const engineKey = `vehicle.engine-${v.engineDemo || ''}`;
                const revealedEngine = revealedFields[engineKey];

                return (
                  <div key={v.id} className={styles.vehicleCard}>
                    <div className={styles.cardHeader}>
                      <div>
                        <div className={styles.plateNumber}>{maskedPlateText}</div>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--iron)', marginTop: '4px', display: 'inline-block' }}>
                          {v.vehicleType}
                        </span>
                      </div>
                      <span className={styles.roleTag}>{v.ownerRole}</span>
                    </div>

                    {/* Masked Metadata Grid */}
                    <div className={styles.fieldGrid}>
                      {/* Chassis */}
                      <div className={styles.fieldRow}>
                        <span className={styles.fieldLabel}>Chassis Number</span>
                        <div className={styles.fieldValueGroup}>
                          {revealedChassis ? (
                            <div className={styles.activeRevealNotice}>
                              <span className={styles.fieldValue}>{revealedChassis.value}</span>
                              <span style={{ fontSize: '0.6875rem' }}>
                                ({Math.max(0, Math.ceil((revealedChassis.expiresAt - Date.now()) / 1000))}s)
                              </span>
                              <button
                                type="button"
                                className={styles.hideNowBtn}
                                onClick={() => hideFieldAction('vehicle.chassis')}
                              >
                                Hide
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className={styles.fieldValue}>
                                {isFamily ? maskChassis(v.chassisDemo || '') : (v.chassisDemo || '•••••')}
                              </span>
                              {isFamily && (
                                <button
                                  type="button"
                                  className={styles.revealBtn}
                                  onClick={() =>
                                    openReveal('vehicle.chassis', 'Chassis Number', v.chassisDemo || '', v.plate)
                                  }
                                >
                                  Reveal
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Engine */}
                      <div className={styles.fieldRow}>
                        <span className={styles.fieldLabel}>Engine Number</span>
                        <div className={styles.fieldValueGroup}>
                          {revealedEngine ? (
                            <div className={styles.activeRevealNotice}>
                              <span className={styles.fieldValue}>{revealedEngine.value}</span>
                              <span style={{ fontSize: '0.6875rem' }}>
                                ({Math.max(0, Math.ceil((revealedEngine.expiresAt - Date.now()) / 1000))}s)
                              </span>
                              <button
                                type="button"
                                className={styles.hideNowBtn}
                                onClick={() => hideFieldAction('vehicle.engine')}
                              >
                                Hide
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className={styles.fieldValue}>
                                {isFamily ? maskEngine(v.engineDemo || '') : (v.engineDemo || '•••••')}
                              </span>
                              {isFamily && (
                                <button
                                  type="button"
                                  className={styles.revealBtn}
                                  onClick={() =>
                                    openReveal('vehicle.engine', 'Engine Number', v.engineDemo || '', v.plate)
                                  }
                                >
                                  Reveal
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Aadhaar (ALWAYS HIDDEN / LOCKED for family member) */}
                      {v.aadhaarDemo && (
                        <div className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>Owner Aadhaar</span>
                          <div className={styles.fieldValueGroup}>
                            <span className={styles.fieldValue}>{maskAadhaar(v.aadhaarDemo)}</span>
                            {isFamily && (
                              <span className={styles.lockedNotice} title="Aadhaar is permanently locked from delegated viewing under Section 29 Aadhaar Act">
                                🔒 Locked
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* DL (ALWAYS HIDDEN / LOCKED for family member) */}
                      {v.dlDemo && (
                        <div className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>Driving Licence</span>
                          <div className={styles.fieldValueGroup}>
                            <span className={styles.fieldValue}>{maskDL(v.dlDemo)}</span>
                            {isFamily && (
                              <span className={styles.lockedNotice} title="Family DL number is permanently restricted by privacy policy">
                                🔒 Locked
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Challans (Location ALWAYS HIDDEN) */}
                      {v.challansDemo && v.challansDemo.length > 0 && (
                        <div className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>e-Challans</span>
                          <div className={styles.fieldValueGroup}>
                            <span className={styles.fieldValue} style={{ color: 'var(--status-missed)' }}>
                              {v.challansDemo.length} pending
                            </span>
                            {isFamily && (
                              <span className={styles.lockedNotice} title="Challan location records are hidden for personal privacy">
                                📍 Location hidden
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Renewal items / tasks */}
                    {v.renewalItems.length > 0 && (
                      <div className={styles.renewalsList}>
                        <div className={styles.renewalHeader}>Upcoming Statutory Deadlines</div>
                        {v.renewalItems.map((item) => (
                          <div key={item.id} className={styles.renewalItem}>
                            <span>{item.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
                                Day {item.dueDate}
                              </span>
                              <StatusTag status="Safe" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* ============================================================== */
          /* VIEW B: FAMILY MEMBER (GRANTER DEVICE VIEW) */
          /* ============================================================== */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Banner
              variant="info"
              title="Granter Device View (Simulated)"
            >
              This screen simulates the phone of your family member. Here, the granter can
              review, approve, customize, or revoke access permissions granted to you.
            </Banner>

            {/* Pending Requests */}
            <h2 style={{ fontSize: 'var(--font-size-xl)' }}>Pending Delegation Requests</h2>
            {pendingRequestsForFamily.length === 0 ? (
              <p style={{ color: 'var(--iron)', fontSize: 'var(--font-size-sm)' }}>
                No pending requests. Requests made from the citizen view will appear here for authorization.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {pendingRequestsForFamily.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      padding: 'var(--space-4)',
                      backgroundColor: 'var(--paper)',
                      border: '1px solid var(--stone)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div>
                      <strong>{req.granteeRole}</strong> has requested access to manage vehicle{' '}
                      <strong>{req.vehicleIds.join(', ')}</strong>.
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--iron)' }}>
                      Requested scopes: <code>{req.scopes.join(', ')}</code>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => grantConsentAction(req.id, ['view'])}
                      >
                        Approve (View only)
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => grantConsentAction(req.id, ['view', 'apply'])}
                      >
                        Approve (View + Apply)
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => declineConsentAction(req.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active Grants */}
            <h2 style={{ fontSize: 'var(--font-size-xl)', marginTop: 'var(--space-4)' }}>
              Active Authorized Grants
            </h2>
            {consents.filter((c) => c.status === 'granted').map((grant) => (
              <div
                key={grant.id}
                style={{
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--paper)',
                  border: '1px solid var(--stone)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                }}
              >
                <div>
                  <div>
                    Access granted to <strong>{grant.granteeRole}</strong> for vehicle{' '}
                    <strong>{grant.vehicleIds.join(', ')}</strong>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--iron)', marginTop: '4px' }}>
                    Active scopes: <code>{grant.scopes.join(', ')}</code> • Aadhaar and DL permanently locked
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => revokeConsentAction(grant.id)}
                >
                  Revoke Access
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* AUDIT LOG SECTION */}
        {/* ============================================================== */}
        <section className={styles.auditSection} aria-labelledby="audit-log-title">
          <div className={styles.auditHeaderRow}>
            <div>
              <h2 id="audit-log-title" style={{ fontSize: 'var(--font-size-xl)' }}>
                Immutable Privacy & Access Audit Log
              </h2>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--iron)', margin: 0 }}>
                Every consent grant, decline, revocation, and field reveal is recorded here with purpose justifications.
              </p>
            </div>
            <div className={styles.auditActionsGroup}>
              <Button variant="secondary" size="sm" onClick={handleDownloadAuditLog}>
                Download log (JSON)
              </Button>
              <Button variant="secondary" size="sm" onClick={clearAuditLogAction}>
                Clear demo log
              </Button>
            </div>
          </div>

          {/* Audit Filters */}
          <div className={styles.auditFilters}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Filter Actor:</span>
            <select
              className={styles.selectInput}
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value as 'All' | 'You' | 'Family member')}
              aria-label="Filter audit log by actor"
            >
              <option value="All">All Actors</option>
              <option value="You">You</option>
              <option value="Family member">Family member</option>
            </select>

            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, marginLeft: 'var(--space-2)' }}>
              Filter Action:
            </span>
            <select
              className={styles.selectInput}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as typeof actionFilter)}
              aria-label="Filter audit log by action"
            >
              <option value="All">All Actions</option>
              <option value="reveal">Reveal</option>
              <option value="grant">Grant</option>
              <option value="revoke">Revoke</option>
              <option value="request">Request</option>
              <option value="decline">Decline</option>
            </select>
          </div>

          {/* DataTable */}
          <DataTable
            caption="Access and Disclosure Audit Trail"
            columns={auditColumns}
            data={filteredAuditLog}
            getRowKey={(item) => item.id}
          />
        </section>

        {/* ============================================================== */}
        {/* REVEAL DIALOG MODAL */}
        {/* ============================================================== */}
        {revealModal.isOpen && (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeReveal();
            }}
          >
            <div
              className={styles.modalContent}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reveal-modal-title"
            >
              <h3 id="reveal-modal-title" className={styles.modalTitle}>
                Time-Limited Field Reveal (60 Seconds)
              </h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--charcoal)', margin: 0 }}>
                You are requesting to reveal <strong>{revealModal.fieldLabel}</strong> for vehicle{' '}
                <strong>{revealModal.vehiclePlate}</strong>. To comply with privacy-by-design standards,
                select an approved statutory purpose.
              </p>

              {revealError && (
                <div style={{ color: 'var(--status-missed)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                  {revealError}
                </div>
              )}

              <form onSubmit={handleExecuteReveal} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="reveal-purpose-select" className={styles.formLabel}>
                    Purpose of Disclosure:
                  </label>
                  <select
                    id="reveal-purpose-select"
                    className={styles.selectInput}
                    value={selectedPurpose}
                    onChange={(e) => setSelectedPurpose(e.target.value)}
                  >
                    {VALID_PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPurpose === 'Other' && (
                  <div className={styles.formGroup}>
                    <label htmlFor="custom-justification" className={styles.formLabel}>
                      Detailed Justification (minimum 10 characters):
                    </label>
                    <textarea
                      id="custom-justification"
                      className={styles.textareaInput}
                      placeholder="e.g. Updating registration paperwork for inter-state move"
                      value={customJustification}
                      onChange={(e) => setCustomJustification(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className={styles.modalActions}>
                  <Button type="button" variant="secondary" onClick={closeReveal}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Reveal for 60s
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ADD VEHICLE MODAL */}
        {/* ============================================================== */}
        {isAddVehicleOpen && (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsAddVehicleOpen(false);
            }}
          >
            <div
              className={styles.modalContent}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-vehicle-title"
            >
              <h3 id="add-vehicle-title" className={styles.modalTitle}>
                Add Vehicle to Household
              </h3>

              <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--stone)', paddingBottom: 'var(--space-2)' }}>
                <Button
                  variant={newVehicleTab === 'existing' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setNewVehicleTab('existing')}
                >
                  Existing Registration
                </Button>
                <Button
                  variant={newVehicleTab === 'new_reg' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setNewVehicleTab('new_reg')}
                >
                  New Vehicle (Form 20)
                </Button>
              </div>

              {addVehicleError && (
                <div style={{ color: 'var(--status-missed)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                  {addVehicleError}
                </div>
              )}

              <form onSubmit={handleAddVehicleSubmit} className={styles.modalForm}>
                {newVehicleTab === 'existing' ? (
                  <>
                    <div className={styles.formGroup}>
                      <label htmlFor="vehicle-plate-input" className={styles.formLabel}>
                        Registration Plate (or use Voice / Speech):
                      </label>
                      <input
                        id="vehicle-plate-input"
                        type="text"
                        className={styles.textInput}
                        placeholder="e.g. KA-03-AB-1234"
                        value={newVehiclePlate}
                        onChange={(e) => setNewVehiclePlate(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--iron)' }}>
                      💡 Tip: You can also use the <a href="/voice" style={{ color: 'var(--graphite)', fontWeight: 600 }}>Voice Entry screen</a> to transcribe spoken plates with phonetic auto-fixes!
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--charcoal)' }}>
                    Starting a new vehicle registration workflow under <code>register_new</code> scope.
                    This prepares Form 20 submission and tax computation.
                  </p>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="vehicle-type-select" className={styles.formLabel}>
                    Vehicle Category:
                  </label>
                  <select
                    id="vehicle-type-select"
                    className={styles.selectInput}
                    value={newVehicleType}
                    onChange={(e) => setNewVehicleType(e.target.value)}
                  >
                    <option value="Car">Car (Light Motor Vehicle)</option>
                    <option value="Two-Wheeler">Two-Wheeler (Motorcycle/Scooter)</option>
                    <option value="Commercial">Commercial Vehicle</option>
                  </select>
                </div>

                <div className={styles.modalActions}>
                  <Button type="button" variant="secondary" onClick={() => setIsAddVehicleOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    {newVehicleTab === 'existing' ? 'Save Vehicle' : 'Start Application'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
