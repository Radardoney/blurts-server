"use strict";

const AppConstants = require("../../app-constants");
const home = require("../../controllers/home");
const { getExperimentBranch } = require("../../controllers/utils");
const { scanResult } = require("../../scan-results");

let mockRequest = { fluentFormat: jest.fn(), csrfToken: jest.fn() };

function mockRequestSessionReset(mockRequest) {
  mockRequest.session = {
    excludeFromExperiment: false,
    experimentBranch: false,
  };
  return mockRequest;
}


function addBreachesToMockRequest(mockRequest) {
  const mockBreaches = [
    {Name: "Test"},
    {Name: "DontShow"},
  ];
  mockRequest.app = { locals: { breaches: mockBreaches } };
  return mockRequest;
}

test("home GET without breach renders monitor without breach", () => {
  mockRequest.query = { breach: null };
  mockRequest = addBreachesToMockRequest(mockRequest);
  mockRequest.session = { user: null} ;
  const mockResponse = { render: jest.fn() };

  home.home(mockRequest, mockResponse);

  const mockRenderCallArgs = mockResponse.render.mock.calls[0];
  expect(mockRenderCallArgs[0]).toBe("monitor");
  expect(mockRenderCallArgs[1].featuredBreach).toBe(null);
});


test("home GET with breach renders monitor with breach", async() => {
  const testBreach = {Name: "Test"};
  mockRequest.query = { breach: testBreach.Name };
  mockRequest = addBreachesToMockRequest(mockRequest);
  mockRequest.session = { user: null };
  mockRequest.url = { url: "https://www.mozilla.com" };
  mockRequest.app.locals.SERVER_URL = AppConstants.SERVER_URL;


  const mockResponse = { render: jest.fn(), redirect: jest.fn() };
  home.home(mockRequest, mockResponse);
  const scanRes = await scanResult(mockRequest);

  expect(scanRes.doorhangerScan).toBe(false);
  expect(scanRes.selfScan).toBe(false);
  const mockRenderCallArgs = mockResponse.render.mock.calls[0];
  expect(mockRenderCallArgs[0]).toBe("monitor");
  expect(mockRenderCallArgs[1].featuredBreach).toEqual(testBreach);
});


test("notFound set status 404 and renders 404", () => {
  const mockResponse = { status: jest.fn(), render: jest.fn() };

  home.notFound(mockRequest, mockResponse);

  const mockStatusCallArgs = mockResponse.status.mock.calls[0];
  const mockRenderCallArgs = mockResponse.render.mock.calls[0];
  expect(mockStatusCallArgs[0]).toBe(404);
  expect(mockRenderCallArgs[0]).toBe("subpage");
});

test("Experiment 2 Cohort Assignment Unit Test", () => {
  mockRequest.headers = {
    "accept-language": "en",
  };

  mockRequest.session = {
    excludeFromExperiment: false,
  };

  // The session is assigned to the control group when the coin flip is 0;
  let experimentNumber = 0;
  let experimentBranch = getExperimentBranch(mockRequest, experimentNumber);
  expect(experimentBranch).toBe("va");

  mockRequestSessionReset(mockRequest);

  // The session is assigned to the control group when the coin flip is 28;
  experimentNumber = 28;
  experimentBranch = getExperimentBranch(mockRequest, experimentNumber);
  expect(experimentBranch).toBe("va");

  mockRequestSessionReset(mockRequest);

  // The session is assigned to the treatment group when the coin flip is 29;
  experimentNumber = 29;
  experimentBranch = getExperimentBranch(mockRequest, experimentNumber);
  expect(experimentBranch).toBe("vb");

  mockRequestSessionReset(mockRequest);

  // The session is assigned to the treatment group when the coin flip is 57
  experimentNumber = 57;
  experimentBranch = getExperimentBranch(mockRequest, experimentNumber);
  expect(experimentBranch).toBe("vb");

  mockRequestSessionReset(mockRequest);

  // The session is excluded from the experiment when the coin flip is 58
  experimentNumber = 58;
  experimentBranch = getExperimentBranch(mockRequest, experimentNumber);
  expect(experimentBranch).toBeFalsy();

  mockRequestSessionReset(mockRequest);

  // The session is excluded from the experiment when the coin flip is 99
  experimentNumber = 99;
  experimentBranch = getExperimentBranch(mockRequest, experimentNumber);
  expect(experimentBranch).toBeFalsy();
});
