
## Deploy the Console on Linux

The console can be bound to the same web listener as the controller's management API. The console is then accessed by navigating to the controller's web address.

1. On the controller host, download the latest release of the console.

    ```text
    wget https://github.com/openziti/ziti-console/releases/latest/download/ziti-console.zip
    ```

1. Unzip the console in the controller's working directory.

    ```text
    sudo unzip -d /var/lib/ziti-controller/zac ./ziti-console.zip
    ```

1. In the controller's configuration file, locate the web listener that binds the `edge-management` API. You must bind the console to the same listener.

1. Add a new API binding `zac` to the same web listener. Set the `location`  option the relative path to unziped console files.

    ```text
    web:
        - name: client-management
          bindPoints:
            - interface: 0.0.0.0:1280
              address: localhost:1280
          identity:
            ca: "pki/root/certs/root.cert"
            key: "pki/intermediate/keys/server.key"
            server_cert: "pki/intermediate/certs/server.chain.pem"
            cert: "pki/intermediate/certs/client.cert"
          options:
          apis:
            - binding: edge-management
              options: {}
            - binding: edge-client
              options: {}
            - binding: fabric
              options: {}
            - binding: zac
              options: {"location": "./zac", "indexFile": "index.html"}
    ```

1. Restart the controller service to apply the changes.

    ```text
    sudo systemctl restart ziti-controller.service
    ```

1. Visit the controller's web address in a browser to access the console.

    ```text
    https://ziti.example.com:1280/zac
    ```

1. Optionally, configure a server certificate for the console by adding `alt_server_certs`. The certificate's SAN must be distinct from the controller's address to avoid conflicts. For example, if your controller's address is `ziti.example.com`, the console's address could be `console.example.com`. Both DNS names resolve to the same IP address.

    ```text
    web:
        - name: client-management
          bindPoints:
            - interface: 0.0.0.0:1280
              address: localhost:1280
          identity:
            ca: pki/root/certs/root.cert
            key: pki/intermediate/keys/server.key
            server_cert: pki/intermediate/certs/server.chain.pem
            cert: pki/intermediate/certs/client.cert
            alt_server_certs:
              - server_cert: console.chain.pem
                server_key:  console.key
          options:
          apis:
            - binding: edge-management
              options: {}
            - binding: edge-client
              options: {}
            - binding: fabric
              options: {}
            - binding: zac
              options:
                location: ./zac
                indexFile: index.html
    ```
