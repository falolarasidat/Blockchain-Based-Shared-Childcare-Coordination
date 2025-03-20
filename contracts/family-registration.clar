;; Family Registration Contract
;; Records details of participating households

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map families
  { family-id: (string-ascii 36) }
  {
    principal: principal,
    family-name: (string-ascii 100),
    contact-info: (string-ascii 100),
    children-count: uint,
    preferences: (string-ascii 500),
    active: bool
  }
)

(define-map family-principals
  { principal: principal }
  { family-id: (string-ascii 36) }
)

;; Error codes
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_ALREADY_REGISTERED u2)
(define-constant ERR_NOT_FOUND u3)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Register a new family
(define-public (register-family
    (family-id (string-ascii 36))
    (family-name (string-ascii 100))
    (contact-info (string-ascii 100))
    (children-count uint)
    (preferences (string-ascii 500)))
  (let ((existing-family (map-get? family-principals { principal: tx-sender })))
    (asserts! (is-none existing-family) (err ERR_ALREADY_REGISTERED))

    (map-set families
      { family-id: family-id }
      {
        principal: tx-sender,
        family-name: family-name,
        contact-info: contact-info,
        children-count: children-count,
        preferences: preferences,
        active: true
      }
    )

    (map-set family-principals
      { principal: tx-sender }
      { family-id: family-id }
    )

    (ok true)
  )
)

;; Update family information
(define-public (update-family
    (family-id (string-ascii 36))
    (family-name (string-ascii 100))
    (contact-info (string-ascii 100))
    (children-count uint)
    (preferences (string-ascii 500)))
  (let ((family (map-get? families { family-id: family-id })))
    (asserts! (is-some family) (err ERR_NOT_FOUND))
    (asserts! (is-eq tx-sender (get principal (unwrap-panic family))) (err ERR_UNAUTHORIZED))

    (map-set families
      { family-id: family-id }
      {
        principal: tx-sender,
        family-name: family-name,
        contact-info: contact-info,
        children-count: children-count,
        preferences: preferences,
        active: (get active (unwrap-panic family))
      }
    )

    (ok true)
  )
)

;; Deactivate a family
(define-public (deactivate-family (family-id (string-ascii 36)))
  (let ((family (map-get? families { family-id: family-id })))
    (asserts! (is-some family) (err ERR_NOT_FOUND))
    (asserts! (or (is-admin) (is-eq tx-sender (get principal (unwrap-panic family)))) (err ERR_UNAUTHORIZED))

    (map-set families
      { family-id: family-id }
      (merge (unwrap-panic family) { active: false })
    )

    (ok true)
  )
)

;; Reactivate a family
(define-public (reactivate-family (family-id (string-ascii 36)))
  (let ((family (map-get? families { family-id: family-id })))
    (asserts! (is-some family) (err ERR_NOT_FOUND))
    (asserts! (or (is-admin) (is-eq tx-sender (get principal (unwrap-panic family)))) (err ERR_UNAUTHORIZED))

    (map-set families
      { family-id: family-id }
      (merge (unwrap-panic family) { active: true })
    )

    (ok true)
  )
)

;; Read-only function to get family details
(define-read-only (get-family (family-id (string-ascii 36)))
  (map-get? families { family-id: family-id })
)

;; Read-only function to get family by principal
(define-read-only (get-family-by-principal (owner principal))
  (let ((family-id (map-get? family-principals { principal: owner })))
    (if (is-some family-id)
      (map-get? families { family-id: (get family-id (unwrap-panic family-id)) })
      none
    )
  )
)

;; Set a new admin (only current admin can do this)
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (var-set admin new-admin)
    (ok true)
  )
)

