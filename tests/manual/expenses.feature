Feature: Manage expenses
  As a user I want to record, change and remove expenses
  so that I can keep track of my spending.

  Background:
    Given the Expense Tracker is open in the browser

  @TC-001 @smoke
  Scenario: Add an expense with valid data
    When I enter amount "250", choose category "Food" and description "Lunch with team"
    And I click "Add expense"
    Then the expense "Lunch with team" appears in the list with amount "250.00"
    And the monthly total shows "250.00"

  @TC-002
  Scenario: Add an expense without an amount
    When I leave the amount empty and click "Add expense"
    Then I see an error message mentioning "Amount"
    And no expense is added to the list

  @TC-003
  Scenario: Edit an existing expense
    Given an expense "Original" of 100 in category "Food" exists
    When I click "Edit" on "Original"
    And I change the amount to "300", the category to "Travel" and the description to "Edited"
    And I click "Save changes"
    Then the list shows "Edited" with amount "300.00" in "Travel"
    And "Original" is no longer listed

  @TC-004
  Scenario: Delete an expense
    Given expenses "To delete" and "To keep" exist
    When I click "Delete" on "To delete"
    Then "To delete" is removed from the list
    And "To keep" is still listed
