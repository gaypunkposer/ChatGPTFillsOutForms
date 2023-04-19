# ChatGPTFillsOutForms

Specifically the https://ago.mo.gov/file-a-complaint/transgender-center-concerns form.

With the docker compose file, the script will initiate VPN connections, submit the form with ChatGPT supplied data, then restart the VPN connection to get a new IP address.
Be sure to fill out the details for [gluetun](https://github.com/qdm12/gluetun) to get this functionality to work.

  docker build . -t gaypunkposer/chatgpt-form-filler
  docker compose up -d
