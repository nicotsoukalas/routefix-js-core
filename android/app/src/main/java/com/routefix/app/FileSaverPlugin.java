package com.routefix.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.io.OutputStream;

@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {

    @PluginMethod
    public void saveXlsx(PluginCall call) {

        String fileName = call.getString("fileName");
        String base64Data = call.getString("data");

        if (fileName == null || fileName.isEmpty()) {
            call.reject("Nome do arquivo não informado.");
            return;
        }

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Dados do arquivo não informados.");
            return;
        }

        try {
            byte[] fileBytes = Base64.decode(
                base64Data,
                Base64.DEFAULT
            );

            ContentResolver resolver =
                getContext().getContentResolver();

            ContentValues values = new ContentValues();

            values.put(
                MediaStore.Downloads.DISPLAY_NAME,
                fileName
            );

            values.put(
                MediaStore.Downloads.MIME_TYPE,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {

                values.put(
                    MediaStore.Downloads.RELATIVE_PATH,
                    Environment.DIRECTORY_DOWNLOADS
                );

                values.put(
                    MediaStore.Downloads.IS_PENDING,
                    1
                );
            }

            Uri uri = resolver.insert(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                values
            );

            if (uri == null) {
                call.reject("Não foi possível criar o arquivo em Downloads.");
                return;
            }

            try (OutputStream outputStream =
                     resolver.openOutputStream(uri)) {

                if (outputStream == null) {
                    throw new Exception(
                        "Não foi possível abrir o arquivo para escrita."
                    );
                }

                outputStream.write(fileBytes);
                outputStream.flush();
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {

                ContentValues updateValues = new ContentValues();

                updateValues.put(
                    MediaStore.Downloads.IS_PENDING,
                    0
                );

                resolver.update(
                    uri,
                    updateValues,
                    null,
                    null
                );
            }

            JSObject result = new JSObject();

            result.put(
                "uri",
                uri.toString()
            );

            result.put(
                "fileName",
                fileName
            );

            call.resolve(result);

        } catch (Exception error) {

            call.reject(
                "Erro ao salvar arquivo: " +
                error.getMessage()
            );
        }
    }
}