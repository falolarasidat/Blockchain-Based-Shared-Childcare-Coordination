;; Contribution Tracking Contract
;; Monitors hours provided by each participant

;; Define data variables
(define-data-var admin principal tx-sender)

;; Define maps
(define-map contributions
  { family-id: (string-ascii 36) }
  {
    total-hours: uint,
    last-updated: uint
  }
)

(define-map contribution-records
  { record-id: (string-ascii 36) }
  {
    family-id: (string-ascii 36),
    schedule-id: (string-ascii 36),
    slot-date: uint,
    hours: uint,
    children-served: uint,
    verified: bool,
    verifier: (optional principal)
  }
)

;; Define maps for slot information (simplified version of what would be in schedule-management)
(define-map slots
  { schedule-id: (string-ascii 36), slot-date: uint }
  {
    family-id: (string-ascii 36),
    status: (string-ascii 20)
  }
)

;; Error codes
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_NOT_FOUND u2)
(define-constant ERR_ALREADY_EXISTS u3)
(define-constant ERR_INVALID_HOURS u4)
(define-constant ERR_SLOT_NOT_COMPLETED u5)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Register a slot (simplified version of what would be in schedule-management)
(define-public (register-slot
    (schedule-id (string-ascii 36))
    (slot-date uint)
    (family-id (string-ascii 36))
    (status (string-ascii 20)))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))

    (map-set slots
      { schedule-id: schedule-id, slot-date: slot-date }
      {
        family-id: family-id,
        status: status
      }
    )

    (ok true)
  )
)

;; Record a new contribution
(define-public (record-contribution
    (record-id (string-ascii 36))
    (family-id (string-ascii 36))
    (schedule-id (string-ascii 36))
    (slot-date uint)
    (hours uint)
    (children-served uint))
  (let (
    (slot (map-get? slots { schedule-id: schedule-id, slot-date: slot-date }))
    (current-contribution (map-get? contributions { family-id: family-id }))
  )
    (asserts! (is-some slot) (err ERR_NOT_FOUND))
    (asserts! (is-eq (get family-id (unwrap-panic slot)) family-id) (err ERR_UNAUTHORIZED))
    (asserts! (is-eq (get status (unwrap-panic slot)) "completed") (err ERR_SLOT_NOT_COMPLETED))
    (asserts! (is-none (map-get? contribution-records { record-id: record-id })) (err ERR_ALREADY_EXISTS))

    ;; Record the contribution
    (map-set contribution-records
      { record-id: record-id }
      {
        family-id: family-id,
        schedule-id: schedule-id,
        slot-date: slot-date,
        hours: hours,
        children-served: children-served,
        verified: false,
        verifier: none
      }
    )

    ;; Update total hours
    (if (is-some current-contribution)
      (map-set contributions
        { family-id: family-id }
        {
          total-hours: (+ (get total-hours (unwrap-panic current-contribution)) hours),
          last-updated: block-height
        }
      )
      (map-set contributions
        { family-id: family-id }
        {
          total-hours: hours,
          last-updated: block-height
        }
      )
    )

    (ok true)
  )
)

;; Verify a contribution record
(define-public (verify-contribution (record-id (string-ascii 36)))
  (let ((record (map-get? contribution-records { record-id: record-id })))
    (asserts! (is-some record) (err ERR_NOT_FOUND))
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))

    (map-set contribution-records
      { record-id: record-id }
      (merge (unwrap-panic record) { verified: true, verifier: (some tx-sender) })
    )

    (ok true)
  )
)

;; Adjust contribution hours (admin only)
(define-public (adjust-contribution-hours
    (record-id (string-ascii 36))
    (new-hours uint))
  (let (
    (record (map-get? contribution-records { record-id: record-id }))
  )
    (asserts! (is-some record) (err ERR_NOT_FOUND))
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))

    (let (
      (old-hours (get hours (unwrap-panic record)))
      (family-id (get family-id (unwrap-panic record)))
      (family-contribution (unwrap! (map-get? contributions { family-id: family-id }) (err ERR_NOT_FOUND)))
      (hour-difference (if (> new-hours old-hours)
                          (- new-hours old-hours)
                          (- old-hours new-hours)))
    )
      ;; Update the record
      (map-set contribution-records
        { record-id: record-id }
        (merge (unwrap-panic record) { hours: new-hours, verified: true, verifier: (some tx-sender) })
      )

      ;; Update total hours
      (map-set contributions
        { family-id: family-id }
        {
          total-hours: (if (> new-hours old-hours)
                          (+ (get total-hours family-contribution) hour-difference)
                          (- (get total-hours family-contribution) hour-difference)),
          last-updated: block-height
        }
      )

      (ok true)
    )
  )
)

;; Update slot status (simplified version of what would be in schedule-management)
(define-public (update-slot-status
    (schedule-id (string-ascii 36))
    (slot-date uint)
    (status (string-ascii 20)))
  (let ((slot (map-get? slots { schedule-id: schedule-id, slot-date: slot-date })))
    (asserts! (is-some slot) (err ERR_NOT_FOUND))
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))

    (map-set slots
      { schedule-id: schedule-id, slot-date: slot-date }
      (merge (unwrap-panic slot) { status: status })
    )

    (ok true)
  )
)

;; Read-only function to get total contribution for a family
(define-read-only (get-total-contribution (family-id (string-ascii 36)))
  (default-to { total-hours: u0, last-updated: u0 } (map-get? contributions { family-id: family-id }))
)

;; Read-only function to get contribution record
(define-read-only (get-contribution-record (record-id (string-ascii 36)))
  (map-get? contribution-records { record-id: record-id })
)

;; Read-only function to get slot
(define-read-only (get-slot (schedule-id (string-ascii 36)) (slot-date uint))
  (map-get? slots { schedule-id: schedule-id, slot-date: slot-date })
)

;; Set a new admin (only current admin can do this)
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (var-set admin new-admin)
    (ok true)
  )
)

