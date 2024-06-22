// Load face-api models
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/MoodTunes/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/MoodTunes/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/MoodTunes/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/MoodTunes/models')
]);

document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('initialContainer').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'block';
    startVideo();
});

function startVideo() {
    const video = document.getElementById('video');
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => console.error(err));
}

const video = document.getElementById('video');
video.addEventListener('play', () => {
    const canvas = document.getElementById('overlayCanvas');
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    }, 100);
});

async function getAccessToken() {
    const result = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
        },
        body: 'grant_type=client_credentials'
    });

    const data = await result.json();
    return data.access_token;
}

async function searchPlaylists(emotion) {
    const accessToken = await getAccessToken();
    const result = await fetch(`https://api.spotify.com/v1/search?q=${emotion}&type=playlist&limit=6`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    });

    const data = await result.json();
    displayPlaylists(data.playlists.items);
}

function displayPlaylists(playlists) {
    const playlistContainer = document.getElementById('playlists');
    playlistContainer.innerHTML = '';
    playlists.forEach(playlist => {
        const playlistElement = document.createElement('div');
        playlistElement.classList.add('playlist');
        playlistElement.innerHTML = `
            <h3>${playlist.name}</h3>
            <img src="${playlist.images[0].url}" alt="${playlist.name}">
            <p><a href="${playlist.external_urls.spotify}" target="_blank">Play on Spotify</a></p>
        `;
        playlistContainer.appendChild(playlistElement);
    });

    document.getElementById('emotionDisplay').style.display = 'block'; // Show emotion text
    document.getElementById('refreshPage').style.display = 'block'; // Show refresh button
    document.getElementById('storeEmotion').style.display = 'none'; // Hide get playlists button
}

document.getElementById('storeEmotion').addEventListener('click', async () => {
    const video = document.getElementById('video');
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
    if (detections) {
        const emotions = detections.expressions;
        const emotion = Object.keys(emotions).reduce((a, b) => emotions[a] > emotions[b] ? a : b);
        document.getElementById('emotionDisplay').innerText = `You seem to be ${emotion} today. Here are a few playlists for ${emotion} mood.`; // Changed text
        searchPlaylists(emotion);
    } else {
        document.getElementById('emotionDisplay').innerText = 'No face detected. Please try again.';
    }
});

// Add event listener to refresh page button
document.getElementById('refreshPage').addEventListener('click', () => {
    location.reload();
});
