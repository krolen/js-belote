docker-compose build

docker tag js-belote-websocket 192.168.0.100:5000/belote-server
docker push 192.168.0.100:5000/belote-server

docker tag js-belote-reverse-proxy 192.168.0.100:5000/belote-rp
docker push 192.168.0.100:5000/belote-rp
