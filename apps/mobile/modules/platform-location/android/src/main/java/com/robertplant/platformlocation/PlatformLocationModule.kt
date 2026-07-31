package com.robertplant.platformlocation

import android.Manifest
import android.content.Context
import android.location.Location
import android.location.LocationManager
import android.os.CancellationSignal
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import androidx.core.os.bundleOf
import androidx.core.util.Consumer
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * One coarse fix from Android's own LocationManager, used only to pick the
 * nearest tide station.
 *
 * This exists instead of `expo-location` because that module hard-depends on
 * `com.google.android.gms:play-services-location`, which is proprietary and
 * therefore forbidden in F-Droid's main repository. iOS still uses
 * `expo-location` — see `lib/native-location.ts`.
 */
class PlatformLocationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PlatformLocation")

    AsyncFunction("requestPermissionsAsync") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(
        appContext.permissions,
        promise,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.ACCESS_FINE_LOCATION
      )
    }

    AsyncFunction("getCurrentPositionAsync") { promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      val providers = PROVIDERS.filter { manager.isProviderEnabled(it) }
      if (providers.isEmpty()) {
        throw LocationUnavailableException()
      }

      // A recent cached fix is plenty for "which station am I near", and skips
      // waiting on a fresh GPS lock.
      val cached = providers.mapNotNull { manager.getLastKnownLocation(it) }.maxByOrNull { it.time }
      if (cached != null && System.currentTimeMillis() - cached.time <= MAX_CACHE_AGE_MS) {
        promise.resolve(cached.toCoords())
        return@AsyncFunction
      }

      // Ask every enabled provider at once and take the first fix: GPS alone can
      // stall indoors, and without Play Services the network provider is often
      // missing or useless.
      val settled = AtomicBoolean(false)
      val pending = AtomicInteger(providers.size)
      val executor = ContextCompat.getMainExecutor(context)
      // Both the type of `signal` and the explicit Consumer are needed:
      // LocationManagerCompat overloads on androidx's and the platform's
      // CancellationSignal, and a bare `null` is ambiguous between them.
      val signal: CancellationSignal? = null
      for (provider in providers) {
        val onLocation = Consumer<Location?> { location ->
          if (location != null) {
            if (settled.compareAndSet(false, true)) {
              promise.resolve(location.toCoords())
            }
          } else if (pending.decrementAndGet() == 0 && settled.compareAndSet(false, true)) {
            promise.reject(LocationUnavailableException())
          }
        }
        LocationManagerCompat.getCurrentLocation(manager, provider, signal, executor, onLocation)
      }
    }
  }

  private companion object {
    val PROVIDERS = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
    const val MAX_CACHE_AGE_MS = 5 * 60 * 1000L
  }
}

private fun Location.toCoords() = bundleOf("latitude" to latitude, "longitude" to longitude)

internal class LocationUnavailableException :
  CodedException("Could not get a location fix — is location turned on?")
