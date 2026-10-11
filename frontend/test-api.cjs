const axios = require('axios');
const fs = require('fs');

async function run() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@college.edu',
      password: 'admin'
    });
    const token = loginRes.data.token;
    console.log('Got token');

    const subjRes = await axios.get('http://localhost:5000/api/academic/subjects', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const subjId = subjRes.data[0].id;

    const sessRes = await axios.post('http://localhost:5000/api/attendance/sessions', { subjectId: subjId }, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const sessionId = sessRes.data.id;
    console.log('Started session:', sessionId);

    const imagePath = 'dataset/Nikhil_Dhore_31/Nikhil_Dhore_31_1.jpg';
    const base64Image = 'data:image/jpeg;base64,' + fs.readFileSync(imagePath, { encoding: 'base64' });

    const recRes = await axios.post('http://localhost:5000/api/attendance/sessions/' + sessionId + '/recognize', {
      image: base64Image
    }, {
      headers: { Authorization: 'Bearer ' + token }
    });

    console.log('Recognition success:', recRes.data);
  } catch (err) {
    console.error('Recognition error:', err.response?.status, err.response?.data);
  }
}
run();
