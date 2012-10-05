instagram-realtime-feed
=======================

List your subscriptions
[/subscriptions](http://jumjum.jit.su/subscriptions)

Add a tag subscription
[/subscribe/tag/hksn](http://jumjum.jit.su/subscribe/tag/hksn)

Add a location subscription
[/subscribe/location/1257285](http://junjun.jit.su/subscribe/location/1257285)

Add a geolocation provided a latitude and longitude coordinates
x [/subscribe/geo/:lat/:long](http://junjun.jit.su/subscribe/geo/:lat/:long)

Delete a subscription
[/delete/:id](#)

curl -F 'client_id=ece9571300f54b3a90e8b46b8a7ca882' \
     -F 'client_secret=eeb25b35adf84786866c6ae7bfae43bb' \
     -F 'object=geography' \
     -F 'aspect=media' \
     -F 'lat=35.657872' \
     -F 'lng=139.70232' \
     -F 'radius=5000' \
     -F 'callback_url=http://jumjum.jit.su/callback' \
     https://api.instagram.com/v1/subscriptions/
     
Todo
====
- Listen to instragram callback from subscription and request recent image via retrn params
- save response from recent image request to redis queue, meanwhile push image to client via socket
- use redis pubsub to socket.