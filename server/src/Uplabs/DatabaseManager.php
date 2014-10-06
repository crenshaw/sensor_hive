<?php

namespace Uplabs;

use PDO;

class DatabaseManager
{
    /** @var PDO */
    public $pdo;

    /**
     * Description: Takes post data and inserts into experiment_data table
     *
     * @param $post - List of values which will make up one row in the database
     *
     * @return bool - true   -- if data was inserted --OR--
     *                false  -- if data could not be inserted
     */
    public function insert($post)
    {
        //Base SQL statement
        $statement = "INSERT INTO experiment_data VALUES";

        //Properly en-quote all values in post
        $values = array_map([$this->pdo, "quote"], $post);

        //Create a parenthesized string from post array
        $row = "(" . implode(', ', $values) . ")";

        //Attach post-values string to base SQL statement
        $statement.=$row;

        //Prepare the statement
        $sql = $this->pdo->prepare($statement);

        //Insert the data
        $result = $sql->execute();

        return $result;
    }

    /**
     * Retrieve all rows from experiment_data table
     *
     * @return array - All Experiment Data
     */
    public function retrieveAll()
    {
        $statement = "SELECT * FROM experiment_data";

        $sql = $this->pdo->prepare($statement);

        $sql->execute();

        return $sql->fetchAll();
    }

    /**
     * Retrieve all experiment data for a specific experiment
     *
     * @param string $experimentName
     * @return array - Experiment Data
     */
    public function retrieveExperimentData($experimentName)
    {
        $statement = "SELECT * FROM experiment_data WHERE experiment_name=" . $this->pdo->quote($experimentName);

        $sql = $this->pdo->prepare($statement);

        $sql->execute();

        return $sql->fetchAll();
    }
}
 