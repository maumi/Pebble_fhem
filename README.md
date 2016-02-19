# Pebble_fhem

Pebble.js app for FHEM

Not my work. Was created by _Markus_ on forum.fhem.de
Link to thread (german) is: http://forum.fhem.de/index.php?topic=41458.0

.pm File needs to be copied to fhem/FHEM and app.js needs to be compiled.
.zip could be imported to cloudpebble and then compiled there.

You need to adjust the config at the beginning of app.js and if you have your fhem protected you need to add auth to fhem_url_str.
In rooms you can put in all rooms you want to see on your watch.

In fhem you can add the following attributes:
attr global userattr pebbleCmd pebbleOrder pebbleReadOnly pebbleHide

pebbleCmd is similar to webCmd and overwrites webCmd settings if set
pebbleOrder is to sort the entrys in a room
pebbleReadOnly is self-explanary
pebbleHide is to hide entrys on the watch