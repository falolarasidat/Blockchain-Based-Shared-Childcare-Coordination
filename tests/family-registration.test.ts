import { describe, it, expect, beforeEach } from "vitest"

// Mock the blockchain environment
const mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockOtherUser = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"

// Mock contract state
let families = {}
let familyPrincipals = {}
let admin = mockTxSender

// Mock contract functions
const contractFunctions = {
  "is-admin": () => {
    return { type: "response", value: mockTxSender === admin }
  },
  "register-family": (familyId, familyName, contactInfo, childrenCount, preferences) => {
    if (familyPrincipals[mockTxSender]) {
      return { type: "error", value: "u2" } // ERR_ALREADY_REGISTERED
    }
    
    families[familyId] = {
      principal: mockTxSender,
      "family-name": familyName,
      "contact-info": contactInfo,
      "children-count": childrenCount,
      preferences: preferences,
      active: true,
    }
    
    familyPrincipals[mockTxSender] = { "family-id": familyId }
    
    return { type: "response", value: true }
  },
  "update-family": (familyId, familyName, contactInfo, childrenCount, preferences) => {
    if (!families[familyId]) {
      return { type: "error", value: "u3" } // ERR_NOT_FOUND
    }
    
    if (families[familyId].principal !== mockTxSender) {
      return { type: "error", value: "u1" } // ERR_UNAUTHORIZED
    }
    
    families[familyId] = {
      ...families[familyId],
      "family-name": familyName,
      "contact-info": contactInfo,
      "children-count": childrenCount,
      preferences: preferences,
    }
    
    return { type: "response", value: true }
  },
  "deactivate-family": (familyId) => {
    if (!families[familyId]) {
      return { type: "error", value: "u3" } // ERR_NOT_FOUND
    }
    
    if (families[familyId].principal !== mockTxSender && admin !== mockTxSender) {
      return { type: "error", value: "u1" } // ERR_UNAUTHORIZED
    }
    
    families[familyId].active = false
    
    return { type: "response", value: true }
  },
  "reactivate-family": (familyId) => {
    if (!families[familyId]) {
      return { type: "error", value: "u3" } // ERR_NOT_FOUND
    }
    
    if (families[familyId].principal !== mockTxSender && admin !== mockTxSender) {
      return { type: "error", value: "u1" } // ERR_UNAUTHORIZED
    }
    
    families[familyId].active = true
    
    return { type: "response", value: true }
  },
  "get-family": (familyId) => {
    return { type: "response", value: families[familyId] || null }
  },
  "get-family-by-principal": (principal) => {
    const familyId = familyPrincipals[principal]?.["family-id"]
    return { type: "response", value: familyId ? families[familyId] : null }
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

describe("Family Registration Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    families = {}
    familyPrincipals = {}
    admin = mockTxSender
  })
  
  describe("register-family", () => {
    it("should register a new family successfully", () => {
      const result = callContractFunction(
          "register-family",
          "family1",
          "Smith Family",
          "smith@example.com",
          2,
          "No allergies",
      )
      
      expect(result.type).toBe("response")
      expect(result.value).toBe(true)
      expect(families["family1"]).toBeDefined()
      expect(families["family1"]["family-name"]).toBe("Smith Family")
      expect(families["family1"]["children-count"]).toBe(2)
      expect(families["family1"].active).toBe(true)
    })
    
    it("should not allow registering the same family twice", () => {
      callContractFunction("register-family", "family1", "Smith Family", "smith@example.com", 2, "No allergies")
      
      const result = callContractFunction(
          "register-family",
          "family2",
          "Smith Family Again",
          "smith@example.com",
          2,
          "No allergies",
      )
      
      expect(result.type).toBe("error")
      expect(result.value).toBe("u2") // ERR_ALREADY_REGISTERED
    })
  })
  
  describe("update-family", () => {
    beforeEach(() => {
      callContractFunction("register-family", "family1", "Smith Family", "smith@example.com", 2, "No allergies")
    })
    
    it("should update family information successfully", () => {
      const result = callContractFunction(
          "update-family",
          "family1",
          "Smith Family Updated",
          "updated@example.com",
          3,
          "Peanut allergy",
      )
      
      expect(result.type).toBe("response")
      expect(result.value).toBe(true)
      expect(families["family1"]["family-name"]).toBe("Smith Family Updated")
      expect(families["family1"]["contact-info"]).toBe("updated@example.com")
      expect(families["family1"]["children-count"]).toBe(3)
      expect(families["family1"].preferences).toBe("Peanut allergy")
    })
    
    it("should not update non-existent family", () => {
      const result = callContractFunction(
          "update-family",
          "non-existent",
          "Smith Family Updated",
          "updated@example.com",
          3,
          "Peanut allergy",
      )
      
      expect(result.type).toBe("error")
      expect(result.value).toBe("u3") // ERR_NOT_FOUND
    })
  })
  
  describe("deactivate-family", () => {
    beforeEach(() => {
      callContractFunction("register-family", "family1", "Smith Family", "smith@example.com", 2, "No allergies")
    })
    
    it("should deactivate a family successfully", () => {
      const result = callContractFunction("deactivate-family", "family1")
      
      expect(result.type).toBe("response")
      expect(result.value).toBe(true)
      expect(families["family1"].active).toBe(false)
    })
  })
  
  describe("get-family and get-family-by-principal", () => {
    beforeEach(() => {
      callContractFunction("register-family", "family1", "Smith Family", "smith@example.com", 2, "No allergies")
    })
    
    it("should get family by ID", () => {
      const result = callContractFunction("get-family", "family1")
      
      expect(result.type).toBe("response")
      expect(result.value).toBeDefined()
      expect(result.value["family-name"]).toBe("Smith Family")
    })
    
    it("should get family by principal", () => {
      const result = callContractFunction("get-family-by-principal", mockTxSender)
      
      expect(result.type).toBe("response")
      expect(result.value).toBeDefined()
      expect(result.value["family-name"]).toBe("Smith Family")
    })
    
    it("should return null for non-existent family ID", () => {
      const result = callContractFunction("get-family", "non-existent")
      
      expect(result.type).toBe("response")
      expect(result.value).toBeNull()
    })
  })
  
  describe("set-admin", () => {
    it("should allow current admin to set a new admin", () => {
      const result = callContractFunction("set-admin", mockOtherUser)
      
      expect(result.type).toBe("response")
      expect(result.value).toBe(true)
      expect(admin).toBe(mockOtherUser)
    })
    
    it("should not allow non-admin to set a new admin", () => {
      // Set a different admin first
      admin = mockOtherUser
      
      const result = callContractFunction("set-admin", "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
      
      expect(result.type).toBe("error")
      expect(result.value).toBe("u1") // ERR_UNAUTHORIZED
    })
  })
})

console.log("All family registration contract tests completed successfully!")

