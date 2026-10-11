const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

async function testReports() {
  console.log("=== REPORTS & ANALYTICS TEST ===");
  try {
    const adminRes = await axios.post(`${API_URL}/auth/login`, { email: 'admin@college.edu', password: 'admin123' });
    const token = adminRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log("\n1. Testing Dashboard Stats");
    let res = await axios.get(`${API_URL}/attendance/dashboard`, { headers });
    console.log("Dashboard Stats:", res.data);

    console.log("\n2. Testing History");
    res = await axios.get(`${API_URL}/attendance/history`, { headers });
    console.log(`History Records Found: ${res.data.length}`);
    if (res.data.length > 0) console.log("Sample:", res.data[0]);

    console.log("\n3. Testing Summary");
    res = await axios.get(`${API_URL}/attendance/summary`, { headers });
    console.log("Summary:", {
      totalSessions: res.data.totalSessions,
      attendancePercentage: res.data.attendancePercentage,
      belowThresholdCount: res.data.belowThresholdCount
    });

    console.log("\n4. Testing Trend");
    res = await axios.get(`${API_URL}/attendance/trend?days=7`, { headers });
    console.log("Trend Data:", res.data);

    console.log("\n5. Testing CSV Export");
    res = await axios.get(`${API_URL}/attendance/export/csv`, { headers });
    console.log("CSV First 3 Lines:\n" + res.data.split('\n').slice(0, 3).join('\n'));

    console.log("\n6. Testing PDF Export");
    res = await axios.get(`${API_URL}/attendance/export/pdf`, { headers, responseType: 'arraybuffer' });
    console.log("PDF Bytes downloaded:", res.data.byteLength);

    console.log("\n✅ ALL TESTS PASSED!");

  } catch (error) {
    console.error("❌ TEST FAILED:");
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error);
    }
  }
}
testReports();
