

## Auth0 Configuration for Spatial Service Discovery

1. Create a new API and define permissions
    - read:ssrs
    - create:ssrs
    - delete:ssrs
    - update:ssrs
2. Configure the value in API settings, identifier as AUTH0_AUDIENCE in .env for oscp-spatial-service-discovery
3. Configure https://<AUTH0 TENANT>.us.auth0.com/ as AUTH0_ISSUER in .env for oscp-spatial-service-discovery
4. Create a new application and choose the appropriate application type ex. single-page web application. For more details on application types, see [https://auth0.com/docs/applications](https://auth0.com/docs/applications)
5. Create a new connection ex. database
6. Create a new role and associate the permissions listed above with the role
7. Create a new user and associate the newly created role
8. Under user details, configure the provider they are associated with in app_metadata as follows:

```
  {
    "provider": "testprovider"
  }
```


9. Create a new rule to embed the app_metadata in the JWT:

```
  function (user, context, callback) {
    context.accessToken['<AUTH0_AUDIENCE>/' + 'provider'] = user.app_metadata.provider;
    callback(null, user, context);
  }
```


10. For a quick development test, the ROPG flow may be used as described at [https://auth0.com/docs/flows/call-your-api-using-resource-owner-password-flow](https://auth0.com/docs/flows/call-your-api-using-resource-owner-password-flow)

    Once this configuration is in place, the sample cURL POST can be used to directly obtain an access token


11. For a production application, use the appropriate client-side SDK (ex. [https://auth0.com/docs/libraries/auth0-single-page-app-sdk](https://auth0.com/docs/libraries/auth0-single-page-app-sdk) ), choose the appropriate flow (ex. PKCE), and configure the required client-side parameters and server-side application URIs. For more details on choosing the flow, see [https://auth0.com/docs/authorization/which-oauth-2-0-flow-should-i-use](https://auth0.com/docs/authorization/which-oauth-2-0-flow-should-i-use)


