# Implementação Android - External User ID

## Arquivo: android/app/src/main/java/app/lovable/.../MainActivity.kt

Adicione este código na classe MainActivity:

```kotlin
package app.lovable.a250e38189046430f852afb55edbf7463

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import java.util.UUID

class MainActivity : BridgeActivity() {
    
    private var externalId: String? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Gerar ou recuperar External User ID
        val sharedPref = getSharedPreferences("onesignal", MODE_PRIVATE)
        externalId = sharedPref.getString("external_id", null)
        
        if (externalId == null) {
            externalId = UUID.randomUUID().toString()
            sharedPref.edit().putString("external_id", externalId).apply()
            println("📱 [Android] Novo External ID gerado: $externalId")
        } else {
            println("📱 [Android] External ID recuperado: $externalId")
        }
    }
    
    override fun onStart() {
        super.onStart()
        
        // Injetar External ID no WebView após carregamento
        bridge.webView.post {
            val js = "window.NATIVE_EXTERNAL_ID = '$externalId';"
            bridge.webView.evaluateJavascript(js) { result ->
                println("📱 [Android] External ID injetado no WebView: $externalId")
            }
        }
    }
}
```

## Notas:
- O UUID é gerado uma única vez e persistido
- É injetado no WebView como `window.NATIVE_EXTERNAL_ID`
- Logs ajudam a debugar
