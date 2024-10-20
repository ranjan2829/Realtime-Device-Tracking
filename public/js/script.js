const socket=io();

if(navigator.geolocation){
      navigator.geolocation.watchPosition(
            (position)=>{
            const{latitude,longitude}=position.coords;
            socket.emit("send-location",{latitude,longitude});

      },
      (error)=>{
            console.error(error);

      },
      {
            enableHighAccuracy:true,
            timeout:5000,
            maximumAge:0,
      }
);
}
const map=L.map("map").setView([0,0],10);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
L.marker([0,0],10).addTo(map)
    .bindPopup('A pretty CSS popup.<br> Easily customizable.')
    .openPopup();