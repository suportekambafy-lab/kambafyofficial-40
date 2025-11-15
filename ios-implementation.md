# Implementação iOS - External User ID

## Arquivo: ios/App/App/AppDelegate.swift

Adicione este código na classe AppDelegate:

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    var window: UIWindow?
    private var externalId: String?
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Gerar ou recuperar External User ID
        let defaults = UserDefaults.standard
        externalId = defaults.string(forKey: "external_id")
        
        if externalId == nil {
            externalId = UUID().uuidString
            defaults.set(externalId, forKey: "external_id")
            print("📱 [iOS] Novo External ID gerado: \(externalId!)")
        } else {
            print("📱 [iOS] External ID recuperado: \(externalId!)")
        }
        
        return true
    }
    
    func applicationWillResignActive(_ application: UIApplication) {
        // Called when the app is about to move from active to inactive state
    }
    
    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers
    }
    
    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state
    }
    
    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the app was inactive
        
        // Injetar External ID no WebView
        if let bridge = (window?.rootViewController as? CAPBridgeViewController) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                guard let self = self, let externalId = self.externalId else { return }
                
                let js = "window.NATIVE_EXTERNAL_ID = '\(externalId)';"
                bridge.webView?.evaluateJavaScript(js) { result, error in
                    if let error = error {
                        print("📱 [iOS] Erro ao injetar External ID: \(error)")
                    } else {
                        print("📱 [iOS] External ID injetado no WebView: \(externalId)")
                    }
                }
            }
        }
    }
    
    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate
    }
}
```

## Notas:
- O UUID é gerado uma única vez e persistido no UserDefaults
- É injetado no WebView como `window.NATIVE_EXTERNAL_ID`
- Aguarda 0.5s para garantir que o WebView está pronto
- Logs ajudam a debugar
