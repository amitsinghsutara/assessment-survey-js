# File downloader and converter tool to get data from the web and convert it to a format that can be used by the app

import os
from pathlib import Path
from pydrive.auth import GoogleAuth
from pydrive.drive import GoogleDrive
from pydub import AudioSegment

config = {
    'driveURL': "11-MYKwGpD-bi9xufUsUoNc_4qdvGSCOK",
    'csvURL': "",
    'tempDir': "tempDir",
    'inputDir': "./audio/west-african-english-lettersounds",
    'outputDir': "./audio/west-african-english-lettersounds",
    'inputFormat': 'wav',
    'inputAudioExt': ".wav",
    'outputAudioExt': ".mp3",
    'doConversion': True,
    'doAudioAndCSVIntergirtyCheck': True,
}

version = "0.0.1"

# Drive auth
# g_auth = GoogleAuth()
# g_auth.LocalWebserverAuth()

# drive = GoogleDrive(g_auth)

drive_folder = config['driveURL']

# write python main function
def main():
    print("Running File Downloader and Converter Tool v" + version)

    # Attempt to download audio files from the drive folder
    # if not os.path.exists(config['inputDir']):
    #     os.makedirs(config['inputDir'])

    # file_list = drive.ListFile({'q': "'{drive_folder}' in parents"}).GetList()

    # for file in file_list:
    #     file.GetContentFile(os.path.join(config['inputDir'], file['title']))

    convert_wavs_in_directory(config['inputDir'], config['outputDir'])

    

def convert_wav_to_mp3(wav_file, output_path):
    audio = AudioSegment.from_file(wav_file, format=config['inputFormat'])
    mp3_file = os.path.join(output_path, os.path.splitext(os.path.basename(wav_file))[0] + config['outputAudioExt'])
    audio.export(mp3_file, format="mp3")
    return mp3_file

def convert_wavs_in_directory(directory_path, output_path):
    if not os.path.exists(output_path):
        os.makedirs(output_path)
    count = 0
    for filename in os.listdir(directory_path):
        if filename.endswith(config['inputAudioExt']):
            wav_file = os.path.join(directory_path, filename)
            convert_wav_to_mp3(wav_file, output_path)
            print(f"Converted {filename} to MP3")
            count += 1

    print(f"Converted {count} files to MP3")

main()




