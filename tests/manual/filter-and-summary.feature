Feature: Filter, sort and summarise expenses

  Background:
    Given the Expense Tracker is open in the browser

  @TC-005
  Scenario: Filter expenses by category
    Given a "Food" expense "Groceries" and a "Travel" expense "Taxi" exist
    When I filter by category "Travel" and click "Apply filters"
    Then only "Taxi" is listed

  @TC-006
  Scenario: Monthly summary shows totals per category
    Given this month has a "Food" expense of 200 and a "Bills" expense of 100
    Then the monthly total shows "300.00"
    And the breakdown lists "Food: 200.00" first

  @TC-007
  Scenario: Sort by highest amount
    Given expenses "Small" (10) and "Large" (900) exist
    When I sort by "Highest amount" and click "Apply filters"
    Then "Large" is listed first
