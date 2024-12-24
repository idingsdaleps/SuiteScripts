from requests_oauthlib import OAuth1
from PIL import Image
import requests
import sys
import glob
import time
import os
import params


REALM = "4480225"
RESTLET_URL = "https://4480225.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=2993&deploy=1&sku="
SCALE_FACTOR = 1.668
BACKGROUND_IMAGE = "background.jpg"
BACKGROUND_HEIGHT = 800
BACKGROUND_WIDTH = 1200
SHELF_POSITION = 173
CENTRE_POSITION = 550
TIME_WINDOW = 100
MAX_HEIGHT = 620
MAX_WIDTH = 475

auth = OAuth1(
    client_key=params.CONSUMER_KEY,
    client_secret=params.CONSUMER_SECRET,
    resource_owner_key=params.TOKEN_ID,
    resource_owner_secret=params.TOKEN_SECRET,
    realm=REALM,
    signature_method="HMAC-SHA256",
)
headers = {"Content-Type": "application/json"}

def createPath(SKU):
    matchingImagesList = glob.glob(str(SKU) + "_media-*.jpg")
    matchingImagesList.sort(reverse=True)
    highestPath = matchingImagesList[0]
    print ("Highest image path is " + highestPath)
    highestPathLen = len(highestPath)
    newPathNumber = int((highestPath[highestPathLen-5:highestPathLen-4]))+1
    return str(SKU) + "_media-" + str(newPathNumber) + ".jpg"

def processImage(SKU, newPath):
    URL = RESTLET_URL + str(SKU)
    print("Using URL " + URL)
    response = requests.request("GET", URL, auth=auth, headers=headers)
    if not response.text.isdigit():
        print("Error response from API, skipping")
        return

    PRODUCT_HEIGHT = int(response.text)
    print("Product Height is " + str(PRODUCT_HEIGHT) + "mm")
    PRODUCT_HEIGHT_PX = round(PRODUCT_HEIGHT * SCALE_FACTOR)
    print("Desired Pixel Height is " + str(PRODUCT_HEIGHT_PX) +"px")
    coverImage = Image.open(str(SKU) + "_media-0.jpg")
    backgroundImage = Image.open(BACKGROUND_IMAGE)
    coverWidth, coverHeight = coverImage.size
    newCoverWidth = round(coverWidth * (PRODUCT_HEIGHT_PX/coverHeight))
    newCoverHeight = PRODUCT_HEIGHT_PX
    print("New Width " + str(newCoverWidth))
    print("New Height " + str(newCoverHeight))
    if (newCoverWidth<MAX_WIDTH) and (newCoverHeight<MAX_HEIGHT):
        coverScaledSize = (newCoverWidth, newCoverHeight)
        coverScaled = coverImage.resize(coverScaledSize)
        topPosition = BACKGROUND_HEIGHT-SHELF_POSITION-PRODUCT_HEIGHT_PX
        leftPosition = CENTRE_POSITION-round(newCoverWidth/2)
        backgroundImage.paste(coverScaled,(leftPosition,topPosition))
        backgroundImage.save("output/" + newPath, quality=95)
    else:
        print("Image too large, skipping")
    


coverFilesList = glob.glob('*_media-0.jpg')
print (str(len(coverFilesList)) + " cover images found")
current_time = time.time()
recentFiles = list()

for coverFile in coverFilesList:
    time_delta = current_time - os.path.getmtime(coverFile)
    time_delta_days = time_delta / (60 * 60 * 24)
    if time_delta_days < TIME_WINDOW:
        print (coverFile + " was last modified " + str(time_delta))
        recentFiles.append(coverFile)

print (str(len(recentFiles)) + " cover images found within time window")

for coverFile in recentFiles:
    print("Processing cover image " + coverFile)
    if not coverFile[:6].isdigit():
        print("Cover image " + coverFile + " incorrect format")
    else:
        coverSKU = int(coverFile[:6])
        newPath = createPath(coverSKU)
        print ("Using new path " + newPath)
        processImage(coverSKU, newPath)
    






