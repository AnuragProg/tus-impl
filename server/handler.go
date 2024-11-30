package main

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
)

var idCounter uint32 = 0

type Metadata struct {
	Offset   uint32
	Filename string
	Location string
	FileSize uint32
}

var metadataStore map[uint32]Metadata = map[uint32]Metadata{}

func Head(ctx echo.Context) error {
	fileId, err := strconv.ParseUint(ctx.Param("fileId"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, echo.Map{"message": "fileid should be of uint32 type"})
	}

	if metadata, ok := metadataStore[uint32(fileId)]; ok {
		ctx.Response().Header().Set("Upload-Offset", fmt.Sprintf("%d", metadata.Offset))
		return ctx.NoContent(http.StatusNoContent)
	}

	return ctx.JSON(http.StatusNotFound, echo.Map{"message": "upload metadata not found"})
}

func Post(ctx echo.Context) error {
	filesize, err := strconv.ParseUint(ctx.Request().Header.Get("Upload-Length"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, echo.Map{"message": "filesize should be a non-negative 32 bit number"})
	}

	uploadMetadata := strings.Split(ctx.Request().Header.Get("Upload-Metadata"), ",")
	parsedMetadata := map[string]string{}

	for _, item := range uploadMetadata {
		pair := strings.Split(item, " ")
		if len(pair) == 2 {
			value, err := base64.StdEncoding.DecodeString(pair[1])
			if err != nil {
				return ctx.JSON(http.StatusBadRequest, echo.Map{"message": "all values in Upload-Metadata should be base64 encoded"})
			}
			parsedMetadata[pair[0]] = string(value)
		}
	}

	idCounter += 1

	filename := parsedMetadata["filename"]
	fileExt := filepath.Ext(filename)
	filenameHashed := base64.StdEncoding.EncodeToString([]byte(filename+fmt.Sprintf("%d", idCounter))) + fileExt // added id counter to uniquely save files

	file, err := os.Create(filename)
	if err != nil {
		idCounter -= 1
		return ctx.JSON(http.StatusInternalServerError, echo.Map{"message": err.Error()})
	}
	file.Close()

	metadataStore[idCounter] = Metadata{0, filename, "./store/" + filenameHashed, uint32(filesize)}

	return ctx.JSON(http.StatusCreated, echo.Map{
		"file_id": idCounter,
	})
}

func Patch(ctx echo.Context) error {
	fileId, err := strconv.ParseUint(ctx.Param("fileId"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, echo.Map{"message": "fileid should be of uint32 type"})
	}

	requestUploadOffset, err := strconv.ParseUint(ctx.Request().Header.Get("Upload-Offset"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, echo.Map{"message": "Upload-Offset header is missing"})
	}

	metadata, ok := metadataStore[uint32(fileId)]
	if !ok {
		return ctx.JSON(http.StatusNotFound, echo.Map{"message": "upload metadata not found"})
	}

	if requestUploadOffset != uint64(metadata.Offset) {
		fmt.Println("Expected: ", metadata.Offset, " && Actual: ", requestUploadOffset)
		return ctx.JSON(http.StatusConflict, echo.Map{"message": "offset doesn't match"})
	}

	file, err := os.OpenFile(metadata.Location, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, echo.Map{"message": err.Error()})
	}
	defer file.Close()

	reader, writer := io.Pipe()
	go func(){
		defer writer.Close()
		written, err := io.Copy(writer, ctx.Request().Body)
		if err != nil {
			return 
		}
		fmt.Println("written", written)
	}()

	defer reader.Close()
	written, err := io.Copy(file, reader)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, echo.Map{"message": err.Error()})
	}

	metadata.Offset += uint32(written)
	metadataStore[uint32(fileId)] = metadata

	ctx.Response().Header().Set("Upload-Offset", fmt.Sprintf("%d", metadata.Offset))
	return ctx.NoContent(http.StatusNoContent)
}

func Delete(ctx echo.Context) error {
	fileId, err := strconv.ParseUint(ctx.Param("fileId"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, echo.Map{"message": "fileid should be of uint32 type"})
	}

	metadata, ok := metadataStore[uint32(fileId)]
	if !ok {
		return ctx.JSON(http.StatusNotFound, echo.Map{"message": "upload metadata not found"})
	}
	os.Remove(metadata.Location)
	delete(metadataStore, uint32(fileId))

	return ctx.NoContent(http.StatusNoContent)
}
