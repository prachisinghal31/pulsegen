exports.validateInput = (company, startDate, endDate) => {
  if (!company) throw new Error("Company name is required");

  // Only validate date order if both are valid Dates
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) throw new Error("Invalid date provided");
    if (s > e) throw new Error("Invalid date range");
  }
};
