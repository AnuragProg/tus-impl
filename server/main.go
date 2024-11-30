package main

import (
	"fmt"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)


func main(){
	server := echo.New()

	server.Use(middleware.Logger())

	server.HEAD("/:fileId", Head)
	server.POST("/", Post)
	server.PATCH("/:fileId", Patch)
	server.DELETE("/:fileId", Delete)

	server.Start(fmt.Sprintf(":%v", API_PORT))
}
