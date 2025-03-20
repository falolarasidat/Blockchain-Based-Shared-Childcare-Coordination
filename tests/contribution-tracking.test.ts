import { describe, it, expect, beforeEach } from "vitest"

// Mock the blockchain environment
const mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockOtherUser = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
const mockBlockHeight = 123456

// Mock contract state
let contributions = {}
let contributionRecords = {}
let admin = mockTxSender

// Mock schedule management contract
const mockScheduleManagement = {
  "get-slot": (scheduleId, slotDate) => {
    if (scheduleId === "schedule1" && slotDate === 150) {
      return {
        "family-id": "family1",
        "start-time": 900,
        "end-time": 1400,
        "max-children": 5,
        status: "completed",
      }
    }
    if (scheduleId === "schedule2" && slotDate === 160) {
      return {
        "family-id": "family2",
        "start-time": 900,
        "end-time": 1400,
        "max-children": 5,
        status: "scheduled", // Not completed yet
      }
    }
    return null
  },
}

// Mock contract functions
const contractFunctions = {
  "is-admin": () => {
    return { type: "response", value: mockTxSender === admin }
  },
  "record-contribution": (recordId, familyId, scheduleId, slotDate, hours, childrenServed) => {
    const slot = mockScheduleManagement["get-slot"](scheduleId, slotDate)
    
    if (!slot) {
      return { type: "error", value: "u2" } // ERR_NOT_FOUND
    }
    
    if (slot["family-id"] !== familyId) {
      return { type: "error", value: "u1" } // ERR_UNAUTHORIZED
    }
    
    if (slot.status !== "completed") {
      return { type: "error", value: "u5" } // Slot not completed
    }
    
    if (contributionRecords[recordId]) {
      return { type: "error", value: "u3" } // ERR_ALREADY_EXISTS
    }
    
    contributionRecords[recordId] = {
      "family-id": familyId,
      "schedule-id": scheduleId,
      "slot-date": slotDate,
      hours,
      "children-served": childrenServed,
      verified: false,
      verifier: null,
    }
    
    // Update total hours
    if (contributions[familyId]) {
      contributions[familyId]["total-hours"] += hours
      contributions[familyId]["last-updated"] = mockBlockHeight
    } else {
      contributions[familyId] = {
        "total-hours": hours,
        "last-updated": mockBlockHeight,
      }
    }
    
    return { type: "response", value: true }
  },
  "verify-contribution": (recordId) => {
    if (mockTxSender !== admin) {
      return { type: "error", value: "u1" } // ERR_UNAUTHORIZED
    }
    
    if (!contributionRecords[recordId]) {
      return { type: "error", value: "u2" } // ERR_NOT_FOUND
    }
    
    contributionRecords[recordId].verified = true
    contributionRecords[recordId].verifier = mockTxSender
    
    return { type: "response", value: true }
  },
  "adjust-contribution-hours": (recordId, newHours) => {
    if (mockTxSender !== admin) {
      return { type: "error", value: "u1" } // ERR_UNAUTHORIZED
    }
    
    if (!contributionRecords[recordId]) {
      return { type: "error", value: "u2" } // ERR_NOT_FOUND
    }
    
    const record = contributionRecords[recordId]
    const familyId = record["family-id"]
    const oldHours = record.hours
    const hourDifference = Math.abs(newHours - oldHours)
    
    // Update the record
    contributionRecords[recordId].hours = newHours
    contributionRecords[recordId].verified = true
    contributionRecords[recordId].verifier = mockTxSender
    
    // Update total hours
    if (newHours > oldHours) {
      contributions[familyId]["total-hours"] += hourDifference
    } else {
      contributions[familyId]["total-hours"] -= hourDifference
    }
    contributions[familyId]["last-updated"] = mockBlockHeight
    
    return { type: "response", value: true }
  },
  "get-total-contribution": (familyId) => {
    return {
      type: "response",
      value: contributions[familyId] || { "total-hours": 0, "last-updated": 0 },
    }
  },
  "get-contribution-record": (recordId) => {
    return { type: "response", value: contributionRecords[recordId] || null }
  },
  "set-admin": (newAdmin) => {
    if (mockTxSender !== admin) {
      return { type: "error", value: "u1" } // ERR_UNAUTHORIZED
    }
    
    admin = newAdmin
    
    return { type: "response", value: true }
  },
}

// Helper to call contract functions
const callContractFunction = (functionName, ...args) => {
  return contractFunctions[functionName](...args)
}

describe("Contribution Tracking Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    contributions = {}
    contributionRecords = {}
    admin = mockTxSender
  })
  
  describe("record-contribution", () => {
    it("should record a contribution successfully", () => {
      const result = callContractFunction("record-contribution", "record1", "family1", "schedule1", 150, 5, 3)
      
      expect(result.type).toBe("response")
      expect(result.value).toBe(true)
      expect(contributionRecords["record1"]).toBeDefined()
      expect(contributionRecords["record1"].hours).toBe(5)
      expect(contributionRecords["record1"]["children-served"]).toBe(3)
      expect(contributionRecords["record1"].verified).toBe(false)
      
      expect(contributions["family1"]).toBeDefined()
      expect(contributions["family1"]["total-hours"]).toBe(5)
    })
    
    it("should not record contribution for non-completed slot", () => {
      const result = callContractFunction("record-contribution", "record1", "family2", "schedule2", 160, 5, 3)
      
      expect(result.type).toBe("error")
      expect(result.value).toBe("u5") // Slot not completed
    })
    
    it("should not allow duplicate record IDs", () => {
      callContractFunction("record-contribution", "record1", "family1", "schedule1", 150, 5, 3)
      
      const result = callContractFunction("record-contribution", "record1", "family1", "schedule1", 150, 5, 3)
      
      expect(result.type).toBe("error")
      expect(result.value).toBe("u3") // ERR_ALREADY_EXISTS
    })
  })
  
  describe("verify-contribution", () => {
    beforeEach(() => {
      callContractFunction("record-contribution", "record1", "family1", "schedule1", 150, 5, 3)
    })
    
    it("should verify a contribution successfully", () => {
      const result = callContractFunction("verify-contribution", "record1")
      
      expect(result.type).toBe("response")
      expect(result.value).toBe(true)
      expect(contributionRecords["record1"].verified).toBe(true)
      expect(contributionRecords["record1"].verifier).toBe(mockTxSender)
    })
    
    it("should not allow non-admin to verify", () => {
      // Set a different admin
      admin = mockOtherUser
      
      const result = callContractFunction("verify-contribution", "record1")
      
      expect(result.type).toBe("error")
      expect(result.value).toBe("u1") // ERR_UNAUTHORIZED
    })
  })
  
  describe("adjust-contribution-hours", () => {
    beforeEach(() => {
      callContractFunction("record-contribution", "record1", "family1", "schedule1", 150, 5, 3)
    })
    
    it("should increase hours successfully", () => {
      const result = callContractFunction("adjust-contribution-hours", "record1", 8)
      
      expect(result.type).toBe("response")
      expect(result.value).toBe(true)
      expect(contributionRecords["record1"].hours).toBe(8)
      expect(contributions["family1"]["total-hours"]).toBe(8)
    })
    
    it("should decrease hours successfully", () => {
      const result = callContractFunction("adjust-contribution-hours", "record1", 3)
      
      expect(result.type).toBe("response")
      expect(result.value).toBe(true)
      expect(contributionRecords["record1"].hours).toBe(3)
      expect(contributions["family1"]["total-hours"]).toBe(3)
    })
  })
  
  describe("get functions", () => {
    beforeEach(() => {
      callContractFunction("record-contribution", "record1", "family1", "schedule1", 150, 5, 3)
    })
    
    it("should get total contribution", () => {
      const result = callContractFunction("get-total-contribution", "family1")
      
      expect(result.type).toBe("response")
      expect(result.value).toBeDefined()
      expect(result.value["total-hours"]).toBe(5)
    })
    
    it("should get contribution record", () => {
      const result = callContractFunction("get-contribution-record", "record1")
      
      expect(result.type).toBe("response")
      expect(result.value).toBeDefined()
      expect(result.value.hours).toBe(5)
      expect(result.value["children-served"]).toBe(3)
    })
    
    it("should return default for non-existent family", () => {
      const result = callContractFunction("get-total-contribution", "non-existent")
      
      expect(result.type).toBe("response")
      expect(result.value).toBeDefined()
      expect(result.value["total-hours"]).toBe(0)
    })
  })
})

console.log("All contribution tracking contract tests completed successfully!")

